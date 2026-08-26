import { router, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useResponsive } from '@/constants/layout';
import { LIMITS, TYPE_COLORS, TYPE_LABELS, type TimerType } from '@/constants/timer';

// ─── Types ──────────────────────────────────────────────────────────────────

type RunPhase = 'setup' | 'running' | 'paused' | 'done';
type TabataPhase = 'work' | 'rest';

interface TimerConfig {
  timerType: TimerType;
  amrapTotalSec: number;
  forTimeCapSec: number;
  forTimeUseCap: boolean;
  emomRounds: number;
  emomSecPerRound: number;
  tabataWorkSec: number;
  tabataRestSec: number;
  tabataRounds: number;
}

interface RuntimeState {
  phase: RunPhase;
  secondsLeft: number;
  secondsElapsed: number;
  round: number;
  reps: number;
  tabataPhase: TabataPhase;
}

type Action =
  | { type: 'START'; config: TimerConfig }
  | { type: 'TICK'; config: TimerConfig }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'INC_ROUND' }
  | { type: 'DEC_ROUND' }
  | { type: 'INC_REP' }
  | { type: 'DEC_REP' }
  | { type: 'MANUAL_DONE' };

// ─── Reducer ─────────────────────────────────────────────────────────────────

const INITIAL_STATE: RuntimeState = {
  phase: 'setup',
  secondsLeft: 0,
  secondsElapsed: 0,
  round: 0,
  reps: 0,
  tabataPhase: 'work',
};

function reducer(state: RuntimeState, action: Action): RuntimeState {
  switch (action.type) {
    case 'START': {
      const { config } = action;
      let secondsLeft = 0;
      let round = 1;
      if (config.timerType === 'AMRAP') { secondsLeft = config.amrapTotalSec; round = 0; }
      if (config.timerType === 'FOR_TIME') round = 0;
      if (config.timerType === 'EMOM') secondsLeft = config.emomSecPerRound;
      if (config.timerType === 'TABATA') secondsLeft = config.tabataWorkSec;
      return { ...INITIAL_STATE, phase: 'running', secondsLeft, round };
    }

    case 'TICK': {
      if (state.phase !== 'running') return state;
      const { config } = action;

      switch (config.timerType) {
        case 'AMRAP': {
          const left = state.secondsLeft - 1;
          if (left <= 0) return { ...state, secondsLeft: 0, phase: 'done' };
          return { ...state, secondsLeft: left };
        }
        case 'FOR_TIME': {
          const elapsed = state.secondsElapsed + 1;
          if (config.forTimeUseCap && elapsed >= config.forTimeCapSec) {
            return { ...state, secondsElapsed: config.forTimeCapSec, phase: 'done' };
          }
          return { ...state, secondsElapsed: elapsed };
        }
        case 'EMOM': {
          const left = state.secondsLeft - 1;
          if (left <= 0) {
            if (state.round >= config.emomRounds) {
              return { ...state, secondsLeft: 0, phase: 'done' };
            }
            return { ...state, secondsLeft: config.emomSecPerRound, round: state.round + 1 };
          }
          return { ...state, secondsLeft: left };
        }
        case 'TABATA': {
          const left = state.secondsLeft - 1;
          if (left <= 0) {
            if (state.tabataPhase === 'work') {
              return { ...state, secondsLeft: config.tabataRestSec, tabataPhase: 'rest' };
            } else {
              if (state.round >= config.tabataRounds) {
                return { ...state, secondsLeft: 0, phase: 'done' };
              }
              return { ...state, secondsLeft: config.tabataWorkSec, tabataPhase: 'work', round: state.round + 1 };
            }
          }
          return { ...state, secondsLeft: left };
        }
      }
      return state;
    }

    case 'PAUSE':
      return { ...state, phase: 'paused' };
    case 'RESUME':
      return { ...state, phase: 'running' };
    case 'RESET':
      return INITIAL_STATE;
    case 'INC_ROUND':
      return { ...state, round: state.round + 1, reps: 0 };
    case 'DEC_ROUND':
      return { ...state, round: Math.max(0, state.round - 1) };
    case 'INC_REP':
      return { ...state, reps: state.reps + 1 };
    case 'DEC_REP':
      return { ...state, reps: Math.max(0, state.reps - 1) };
    case 'MANUAL_DONE':
      return { ...state, phase: 'done' };
    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, '0');
  const s = (Math.abs(seconds) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * 라우트 파라미터를 정수 설정값으로 변환한다.
 * expo-router 파라미터는 제네릭과 무관하게 런타임에 항상 문자열(또는 문자열 배열)로 도착하므로
 * 반드시 파싱해야 하고, 허용 범위를 벗어난 값은 잘라 낸다. 값이 없거나 숫자가 아니면 기본값을 쓴다.
 */
function paramInt(
  raw: string | string[] | undefined,
  range: { min: number; max: number },
  fallback: number,
) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), range.min), range.max);
}

const PRE_START_SECONDS = 10;
const ALARM_LEAD_SECONDS = 3;

// 실행/카운트다운 화면은 시스템 테마와 무관하게 항상 흰 배경으로 고정
const RUN_BG = '#FFFFFF';
const RUN_TEXT = '#111111';
const RUN_TEXT_DIM = '#6B6B70';
const RUN_TRACK = '#E5E5EA';
const REST_COLOR = '#9A9AA0';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  displayValue,
  onInc,
  onDec,
  disableDec,
  disableInc,
  textColor = '#111',
  labelColor = '#888',
  btnBackground = '#E8E8EC',
  compact = false,
  ms,
}: {
  label: string;
  value: number;
  displayValue?: string;
  onInc: () => void;
  onDec: () => void;
  disableDec?: boolean;
  disableInc?: boolean;
  textColor?: string;
  labelColor?: string;
  btnBackground?: string;
  compact?: boolean;
  ms: (size: number) => number;
}) {
  const btnSize = compact ? ms(38) : ms(56);
  return (
    <View style={[stepperStyles.container, { marginBottom: compact ? ms(8) : ms(24) }]}>
      <Text
        style={[stepperStyles.label, { fontSize: compact ? ms(12) : ms(14), marginBottom: compact ? ms(4) : ms(12), color: labelColor }]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
      <View style={[stepperStyles.row, { gap: compact ? ms(14) : ms(24) }]}>
        <Pressable
          style={({ pressed }) => [
            stepperStyles.btn,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2, backgroundColor: btnBackground },
            disableDec && stepperStyles.btnDisabled,
            pressed && stepperStyles.btnPressed,
          ]}
          onPress={onDec}
          disabled={disableDec}
        >
          <Text
            style={[stepperStyles.btnText, { fontSize: compact ? ms(18) : ms(26), color: textColor }, disableDec && stepperStyles.btnTextDisabled]}
            allowFontScaling={false}
          >
            －
          </Text>
        </Pressable>
        <Text
          style={[stepperStyles.value, { fontSize: compact ? ms(26) : ms(40), minWidth: compact ? ms(60) : ms(96), color: textColor }]}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {displayValue ?? value}
        </Text>
        <Pressable
          style={({ pressed }) => [
            stepperStyles.btn,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2, backgroundColor: btnBackground },
            disableInc && stepperStyles.btnDisabled,
            pressed && stepperStyles.btnPressed,
          ]}
          onPress={onInc}
          disabled={disableInc}
        >
          <Text
            style={[stepperStyles.btnText, { fontSize: compact ? ms(18) : ms(26), color: textColor }, disableInc && stepperStyles.btnTextDisabled]}
            allowFontScaling={false}
          >
            ＋
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  label: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnPressed: { opacity: 0.7 },
  btnText: { fontWeight: '500' },
  btnTextDisabled: { color: '#999' },
  value: { fontWeight: '700', textAlign: 'center' },
});

/**
 * 세로모드 진행 표시: 끊김 없이 이어지는 원형 링.
 * SVG 없이 구현하기 위해 좌/우 반원을 각각 overflow:hidden 으로 자르고,
 * 안쪽에 "위+오른쪽 테두리만 색칠한 원"(= 180° 호)을 회전시켜 채워지는 호를 만든다.
 * 호는 화면각 [rot-45°, rot+135°] 를 덮으므로, 원하는 끝각 X 에 대해 rot = X - 135.
 */
function ProgressRing({
  progress,
  color,
  size,
  thickness,
  children,
}: {
  progress: number;
  color: string;
  size: number;
  thickness: number;
  children: React.ReactNode;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const deg = clamped * 360;
  // 오른쪽 반원(0~180°)은 진행이 180°를 넘으면 꽉 찬 상태로 고정
  const rightRot = Math.min(deg, 180) - 135;
  // 왼쪽 반원(180~360°)은 180° 이전이면 호가 통째로 오른쪽에 있어 잘려 안 보임
  const leftRot = Math.max(deg, 180) - 135;

  const arc = (rot: number) => ({
    position: 'absolute' as const,
    top: 0,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: thickness,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: `${rot}deg` }],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 이어지는 트랙 원 */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: RUN_TRACK,
        }}
        pointerEvents="none"
      />

      {/* 오른쪽 반원 클립 */}
      <View style={{ position: 'absolute', left: size / 2, top: 0, width: size / 2, height: size, overflow: 'hidden' }} pointerEvents="none">
        <View style={[arc(rightRot), { left: -size / 2 }]} />
      </View>

      {/* 왼쪽 반원 클립 */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: size / 2, height: size, overflow: 'hidden' }} pointerEvents="none">
        <View style={[arc(leftRot), { left: 0 }]} />
      </View>

      <View style={ringStyles.center}>{children}</View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimerScreen() {
  // WOD 화면에서 넘어올 때는 type 외에 표시용 이름(wod)과 설정 프리필 값이 함께 온다.
  const params = useLocalSearchParams<{
    type: TimerType;
    wod?: string;
    amrapMin?: string;
    emomRounds?: string;
    emomMin?: string;
    tabataWork?: string;
    tabataRest?: string;
    tabataRounds?: string;
  }>();
  const { type } = params;
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const accent = TYPE_COLORS[type] ?? '#FF6B35';
  // WOD에서 진입한 경우 헤더에 타이머 종류 대신 WOD 이름을 보여준다
  const headerTitle = (Array.isArray(params.wod) ? params.wod[0] : params.wod) || TYPE_LABELS[type] || 'TIMER';

  // 화면 크기에 비례하는 반응형 스케일 (기기별로 깨지지 않도록)
  const { width, height, isLandscape, ms } = useResponsive();

  // Setup config
  // 프리필 값은 lazy initializer로 최초 마운트에서 한 번만 읽는다 (이후 스테퍼 조작을 덮어쓰지 않도록).
  // configRef만 채우면 안 된다 — 실행/완료 화면이 configRef가 아니라 아래 state를 직접 읽기 때문에
  // state를 시드하지 않으면 화면 문구와 실제 타이머가 어긋난다.
  const [amrapMin, setAmrapMin] = useState(() => paramInt(params.amrapMin, LIMITS.amrapMin, 20));
  const [forTimeCapMin, setForTimeCapMin] = useState(20);
  const [forTimeUseCap, setForTimeUseCap] = useState(false);
  const [emomRounds, setEmomRounds] = useState(() => paramInt(params.emomRounds, LIMITS.emomRounds, 10));
  const [emomMinPerRound, setEmomMinPerRound] = useState(() =>
    paramInt(params.emomMin, LIMITS.emomMinPerRound, 1),
  );
  const [tabataWork, setTabataWork] = useState(() => paramInt(params.tabataWork, LIMITS.tabataWork, 20));
  const [tabataRest, setTabataRest] = useState(() => paramInt(params.tabataRest, LIMITS.tabataRest, 10));
  const [tabataRounds, setTabataRounds] = useState(() =>
    paramInt(params.tabataRounds, LIMITS.tabataRounds, 8),
  );

  // Runtime state
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const configRef = useRef<TimerConfig | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoundRef = useRef(0);
  const prevTabataPhaseRef = useRef<TabataPhase>('work');

  const headerPaddingVertical = isLandscape ? ms(6) : ms(14);
  const timerBodyGap = isLandscape ? ms(6) : ms(14);
  // 세로모드에서는 상단 캡션과 원형 링 사이, 링과 하단 버튼 사이에 여유를 더 둔다
  const topZonePadding = isLandscape ? ms(6) : ms(28);
  const bottomZonePadding = isLandscape ? ms(10) : ms(28);
  const totalCaptionSize = isLandscape ? ms(18) : ms(26);
  const roundLabelValueSize = isLandscape ? ms(30) : ms(40);
  const roundBtnSize = isLandscape ? ms(72) : ms(80);
  const roundBtnValueSize = isLandscape ? ms(26) : ms(30);
  const roundBtnCaptionSize = ms(12);
  const pauseIndicatorSize = isLandscape ? ms(22) : ms(26);
  const doneBtnHeight = isLandscape ? ms(38) : ms(54);
  const doneBtnFontSize = isLandscape ? ms(14) : ms(19);
  const restartBtnHeight = isLandscape ? ms(44) : ms(60);
  // 캡션/버튼이 실제로 표시되지 않는 경우엔 그 자리를 남겨두지 않는다 —
  // AMRAP/FOR TIME의 총 시간 캡션("20분" 등)은 가로모드에서는 아예 숨겨서 그만큼 숫자를 더 키운다.
  // EMOM/TABATA의 라운드 진행 표시("n / N")는 세로/가로 모두 유지 (진행 상황 확인에 필요).
  const topZoneHasContent =
    state.phase !== 'done' &&
    (type === 'EMOM' ||
      type === 'TABATA' ||
      (!isLandscape && (type === 'AMRAP' || (type === 'FOR_TIME' && forTimeUseCap))));
  // AMRAP은 가로모드에서 완료 버튼이 없어 아래 zone이 비는데, 그러면 FOR TIME(버튼이 있어 아래 zone을 예약함)과
  // 숫자 위치가 달라 보인다 — 가로모드에서는 AMRAP도 같은 크기만큼 예약해 두 화면의 숫자 위치를 맞춘다.
  const bottomZoneHasContent = state.phase === 'done' || type === 'FOR_TIME' || (type === 'AMRAP' && isLandscape);
  // zoneTop과 대칭이 되도록 zoneBottom도 최소 높이를 확보 (버튼이 화면 밖으로 밀려 잘리는 것 방지 + 가운데 시간 표시가 진짜 중앙에 오도록)
  const bottomZoneMinHeight = bottomZoneHasContent
    ? Math.max(doneBtnHeight, restartBtnHeight) + bottomZonePadding
    : bottomZonePadding;

  // zoneCenter(시간 숫자 영역)에 실제로 배정된 높이를 onLayout으로 직접 측정한다.
  // 헤더/상태바/세이프에어리어를 추정치로 빼는 방식은 기기마다 오차가 달라 계속 겹치는 문제가 있었음 —
  // 실측값을 쓰면 어떤 기기든 정확히 남는 공간만큼만 숫자 크기를 정할 수 있어 겹칠 수 없다.
  const [centerHeight, setCenterHeight] = useState(0);
  const handleCenterLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    setCenterHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  }, []);
  // 첫 렌더(실측 전)에는 대략치로 시작 — onLayout 이후 실제 값으로 즉시 보정됨
  const centerBudget = centerHeight > 0 ? centerHeight - 8 : isLandscape ? 220 : 380;

  // 세로모드는 눈금 링 안에 숫자를 넣으므로 링 지름에 종속, 가로모드는 화면 실측 기준 캡 —
  // 단, 어느 쪽이든 centerBudget(실제로 남는 공간)을 넘지 않도록 상한을 건다.
  // zoneCenter의 gap(12)만큼 라운드 카운터 행이 링과 떨어지므로 그만큼도 함께 뺀다
  const roundCounterRowHeight =
    type === 'AMRAP' || type === 'FOR_TIME' ? roundBtnSize + timerBodyGap + roundBtnCaptionSize * 1.4 + 12 : 0;
  // width*비율/ms(고정값) 같은 임의의 상한은 실제로 안전한 크기보다 작게 잡혀 숫자를 불필요하게 줄이는 원인이었음.
  // 높이 쪽은 centerBudget(실측)이 이미 겹치지 않을 최대치를 보장하고, 폭 쪽은 adjustsFontSizeToFit이 알아서
  // 줄여주므로 별도 상한 없이 centerBudget을 최대한 채운다 (ms(280)은 비정상적으로 큰 값만 막는 최후 안전장치).
  const ringSize = Math.max(140, Math.min(width * 0.72, centerBudget - roundCounterRowHeight));
  // 숫자는 내림차순 없이 늘 숫자(0-9, :)만 쓰므로 디센더가 없어 실제 줄 높이는 fontSize의 약 1.15배 정도면 충분
  const bigTimeFontSize = isLandscape
    ? Math.max(60, Math.min(ms(280), centerBudget / 1.15))
    : ringSize * 0.26;
  const ringThickness = Math.max(7, Math.round(ringSize * 0.035));
  const preStartFontSize = isLandscape
    ? Math.min(width * 0.2, height * 0.5, ms(180))
    : Math.min(width * 0.4, ms(150));

  // Pre-start countdown (10초 카운트다운 후 실제 타이머 시작)
  const [preStartCount, setPreStartCount] = useState<number | null>(null);

  // 알람 사운드: 3·2·1 짧은 비프음 + 시작/전환을 알리는 긴 "삐이이이~" 알람
  const beepSoundRef = useRef<Audio.Sound | null>(null);
  const longBeepSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    let sound: Audio.Sound | undefined;
    let longSound: Audio.Sound | undefined;
    (async () => {
      const { sound: loaded } = await Audio.Sound.createAsync(require('@/assets/sounds/beep.wav'));
      sound = loaded;
      beepSoundRef.current = loaded;

      const { sound: loadedLong } = await Audio.Sound.createAsync(require('@/assets/sounds/beep-long.wav'));
      longSound = loadedLong;
      longBeepSoundRef.current = loadedLong;
    })();
    return () => {
      sound?.unloadAsync();
      longSound?.unloadAsync();
      beepSoundRef.current = null;
      longBeepSoundRef.current = null;
    };
  }, []);

  const playBeep = useCallback(() => {
    beepSoundRef.current?.replayAsync().catch(() => {});
  }, []);

  const playLongBeep = useCallback(() => {
    longBeepSoundRef.current?.replayAsync().catch(() => {});
  }, []);

  // 시작 10초 전 카운트다운: 마지막 3초는 짧은 비프, 0에서는 긴 알람으로 시작을 딱 알림
  useEffect(() => {
    if (preStartCount === null) return;

    if (preStartCount <= 0) {
      setPreStartCount(null);
      const config = configRef.current;
      if (config) {
        prevRoundRef.current = type === 'AMRAP' ? 0 : 1;
        prevTabataPhaseRef.current = 'work';
        playLongBeep();
        dispatch({ type: 'START', config });
      }
      return;
    }

    if (preStartCount <= ALARM_LEAD_SECONDS) {
      playBeep();
    }

    const timeout = setTimeout(() => {
      setPreStartCount((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [preStartCount, type, playBeep, playLongBeep]);

  // Screen keep-awake
  useEffect(() => {
    if (state.phase === 'running' || preStartCount !== null) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
    return () => { deactivateKeepAwake(); };
  }, [state.phase, preStartCount]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/stop interval based on phase
  useEffect(() => {
    if (state.phase === 'running') {
      stopInterval();
      intervalRef.current = setInterval(() => {
        if (configRef.current) {
          dispatch({ type: 'TICK', config: configRef.current });
        }
      }, 1000);
    } else {
      stopInterval();
    }
    return stopInterval;
  }, [state.phase, stopInterval]);

  // Vibration feedback on round change / phase change / done
  useEffect(() => {
    if (state.phase !== 'running' && state.phase !== 'done') return;

    if (state.phase === 'done') {
      Vibration.vibrate([0, 300, 100, 300, 100, 600]);
      playLongBeep();
      return;
    }

    if (type === 'EMOM' && state.round !== prevRoundRef.current && state.round > 0) {
      Vibration.vibrate(400);
      prevRoundRef.current = state.round;
      playLongBeep();
    }

    if (type === 'TABATA' && state.tabataPhase !== prevTabataPhaseRef.current) {
      Vibration.vibrate(state.tabataPhase === 'work' ? [0, 150, 80, 300] : [0, 200]);
      prevTabataPhaseRef.current = state.tabataPhase;
      playLongBeep();
    }

    if (type === 'AMRAP' && state.secondsLeft <= 10 && state.secondsLeft > 0 && state.secondsLeft % 1 === 0) {
      Vibration.vibrate(80);
    }

    // 끝나기 3초 전 알람 (AMRAP 전체, EMOM/TABATA 각 구간, FOR_TIME 타임캡)
    const remaining =
      type === 'FOR_TIME'
        ? configRef.current?.forTimeUseCap
          ? configRef.current.forTimeCapSec - state.secondsElapsed
          : null
        : state.secondsLeft;

    if (remaining !== null && remaining !== undefined && remaining > 0 && remaining <= ALARM_LEAD_SECONDS) {
      playBeep();
    }
  }, [state.phase, state.round, state.tabataPhase, state.secondsLeft, state.secondsElapsed, type, playBeep, playLongBeep]);

  const buildConfig = (): TimerConfig => ({
    timerType: type,
    amrapTotalSec: amrapMin * 60,
    forTimeCapSec: forTimeCapMin * 60,
    forTimeUseCap,
    emomRounds,
    emomSecPerRound: emomMinPerRound * 60,
    tabataWorkSec: tabataWork,
    tabataRestSec: tabataRest,
    tabataRounds,
  });

  const handleStart = () => {
    configRef.current = buildConfig();
    setPreStartCount(PRE_START_SECONDS);
  };

  const handleCancelPreStart = () => {
    setPreStartCount(null);
    configRef.current = null;
  };

  const handleReset = () => {
    stopInterval();
    setPreStartCount(null);
    dispatch({ type: 'RESET' });
  };

  // ─── Pre-start Countdown View ────────────────────────────────────────────

  if (preStartCount !== null) {
    const isAlarm = preStartCount <= ALARM_LEAD_SECONDS;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: RUN_BG }]}>
        <View style={[styles.header, { paddingVertical: headerPaddingVertical }]}>
          <Pressable onPress={handleCancelPreStart} hitSlop={8}>
            <Text style={[styles.backText, { fontSize: ms(16), color: RUN_TEXT_DIM }]} maxFontSizeMultiplier={1.2}>
              ✕ 취소
            </Text>
          </Pressable>
          {!isLandscape && (
            <Text
              style={[styles.headerTitle, { fontSize: ms(22), color: accent }]}
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
            >
              {headerTitle}
            </Text>
          )}
          <View style={styles.headerSpacer} />
        </View>
        <View style={[styles.timerBody, styles.preStartBody, { gap: timerBodyGap }]}>
          <Text style={[styles.preStartLabel, { color: RUN_TEXT_DIM }]} maxFontSizeMultiplier={1.2}>
            곧 시작합니다
          </Text>
          <Text
            style={[styles.preStartCount, { fontSize: preStartFontSize, color: isAlarm ? '#FF3B30' : accent }]}
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {preStartCount}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Setup View ───────────────────────────────────────────────────────────

  if (state.phase === 'setup') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingVertical: headerPaddingVertical }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={[styles.backText, { fontSize: ms(16), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
              ← 뒤로
            </Text>
          </Pressable>
          {!isLandscape && (
            <Text
              style={[styles.headerTitle, { fontSize: ms(22), color: accent }]}
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
            >
              {headerTitle}
            </Text>
          )}
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.setupContent,
            isLandscape && { paddingVertical: ms(8), paddingHorizontal: ms(40) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {type === 'AMRAP' && (
            <>
              <Stepper
                label="총 시간 (분)"
                value={amrapMin}
                onInc={() => setAmrapMin(v => Math.min(v + 1, LIMITS.amrapMin.max))}
                onDec={() => setAmrapMin(v => Math.max(v - 1, LIMITS.amrapMin.min))}
                disableDec={amrapMin <= LIMITS.amrapMin.min}
                disableInc={amrapMin >= LIMITS.amrapMin.max}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                btnBackground={colors.backgroundElement}
                compact={isLandscape}
                ms={ms}
              />
            </>
          )}

          {type === 'FOR_TIME' && (
            <>
              <Pressable
                style={[
                  styles.toggleRow,
                  { borderColor: colors.backgroundElement },
                  isLandscape && { paddingVertical: ms(8), marginBottom: ms(10) },
                  forTimeUseCap && { borderColor: accent },
                ]}
                onPress={() => setForTimeUseCap(v => !v)}
              >
                <Text
                  style={[styles.toggleLabel, { fontSize: isLandscape ? ms(14) : ms(17), color: colors.text }]}
                  maxFontSizeMultiplier={1.2}
                >
                  타임캡 사용
                </Text>
                <View style={[styles.toggleTrack, forTimeUseCap && { backgroundColor: accent }]}>
                  <View style={[styles.toggleThumb, forTimeUseCap && styles.toggleThumbOn]} />
                </View>
              </Pressable>
              {forTimeUseCap && (
                <Stepper
                  label="타임캡 (분)"
                  value={forTimeCapMin}
                  onInc={() => setForTimeCapMin(v => Math.min(v + 1, 60))}
                  onDec={() => setForTimeCapMin(v => Math.max(v - 1, 1))}
                  disableDec={forTimeCapMin <= 1}
                  disableInc={forTimeCapMin >= 60}
                  textColor={colors.text}
                labelColor={colors.textSecondary}
                btnBackground={colors.backgroundElement}
                compact={isLandscape}
                ms={ms}
                />
              )}
            </>
          )}

          {type === 'EMOM' && (
            <>
              <Stepper
                label="총 라운드 수"
                value={emomRounds}
                onInc={() => setEmomRounds(v => Math.min(v + 1, LIMITS.emomRounds.max))}
                onDec={() => setEmomRounds(v => Math.max(v - 1, LIMITS.emomRounds.min))}
                disableDec={emomRounds <= LIMITS.emomRounds.min}
                disableInc={emomRounds >= LIMITS.emomRounds.max}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                btnBackground={colors.backgroundElement}
                compact={isLandscape}
                ms={ms}
              />
              <Stepper
                label="라운드당 시간 (분)"
                value={emomMinPerRound}
                onInc={() => setEmomMinPerRound(v => Math.min(v + 1, LIMITS.emomMinPerRound.max))}
                onDec={() => setEmomMinPerRound(v => Math.max(v - 1, LIMITS.emomMinPerRound.min))}
                disableDec={emomMinPerRound <= LIMITS.emomMinPerRound.min}
                disableInc={emomMinPerRound >= LIMITS.emomMinPerRound.max}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                btnBackground={colors.backgroundElement}
                compact={isLandscape}
                ms={ms}
              />
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.backgroundElement },
                  isLandscape && { paddingVertical: ms(6), marginBottom: ms(6) },
                ]}
              >
                <Text
                  style={[styles.infoText, { fontSize: isLandscape ? ms(13) : ms(16), color: colors.textSecondary }]}
                  maxFontSizeMultiplier={1.2}
                >
                  총 {emomRounds * emomMinPerRound}분
                </Text>
              </View>
            </>
          )}

          {type === 'TABATA' && (
            <>
              <Stepper
                label="운동 시간 (초)"
                value={tabataWork}
                displayValue={`${tabataWork}초`}
                onInc={() => setTabataWork(v => Math.min(v + 5, 120))}
                onDec={() => setTabataWork(v => Math.max(v - 5, 5))}
                disableDec={tabataWork <= 5}
                disableInc={tabataWork >= 120}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                btnBackground={colors.backgroundElement}
                compact={isLandscape}
                ms={ms}
              />
              <Stepper
                label="휴식 시간 (초)"
                value={tabataRest}
                displayValue={`${tabataRest}초`}
                onInc={() => setTabataRest(v => Math.min(v + 5, 120))}
                onDec={() => setTabataRest(v => Math.max(v - 5, 5))}
                disableDec={tabataRest <= 5}
                disableInc={tabataRest >= 120}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                btnBackground={colors.backgroundElement}
                compact={isLandscape}
                ms={ms}
              />
              <Stepper
                label="총 라운드 수"
                value={tabataRounds}
                onInc={() => setTabataRounds(v => Math.min(v + 1, LIMITS.tabataRounds.max))}
                onDec={() => setTabataRounds(v => Math.max(v - 1, LIMITS.tabataRounds.min))}
                disableDec={tabataRounds <= LIMITS.tabataRounds.min}
                disableInc={tabataRounds >= LIMITS.tabataRounds.max}
                textColor={colors.text}
                labelColor={colors.textSecondary}
                btnBackground={colors.backgroundElement}
                compact={isLandscape}
                ms={ms}
              />
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.backgroundElement },
                  isLandscape && { paddingVertical: ms(6), marginBottom: ms(6) },
                ]}
              >
                <Text
                  style={[styles.infoText, { fontSize: isLandscape ? ms(13) : ms(16), color: colors.textSecondary }]}
                  maxFontSizeMultiplier={1.2}
                >
                  총 {Math.floor((tabataWork + tabataRest) * tabataRounds / 60)}분 {(tabataWork + tabataRest) * tabataRounds % 60}초
                </Text>
              </View>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.startBtn,
              isLandscape && { height: ms(42), marginTop: ms(8), borderRadius: ms(21) },
              { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleStart}
          >
            <Text
              style={[styles.startBtnText, { fontSize: isLandscape ? ms(16) : ms(21) }]}
              maxFontSizeMultiplier={1.2}
            >
              시작
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Running / Paused / Done View ─────────────────────────────────────────

  const isDone = state.phase === 'done';
  const isPaused = state.phase === 'paused';
  const isWarning = type === 'AMRAP' && !isDone && state.secondsLeft <= 10 && state.secondsLeft > 0;

  const bigTime =
    type === 'FOR_TIME'
      ? formatTime(state.secondsElapsed)
      : formatTime(state.secondsLeft);

  // TABATA는 운동/휴식 배지를 없앤 대신 숫자 색으로 구간을 구분 (휴식은 흐리게)
  const isTabataRest = type === 'TABATA' && !isDone && state.tabataPhase === 'rest';
  const bigTimeColor = isWarning ? '#FF3B30' : isTabataRest ? REST_COLOR : accent;

  const totalRounds = type === 'EMOM' ? emomRounds : tabataRounds;

  // 상단 총 설정 시간 캡션 (참고 앱의 "10 minutes"). 타임캡 없는 FOR TIME은 표시할 게 없어 숨김
  const totalCaption =
    type === 'AMRAP'
      ? `${amrapMin}분`
      : type === 'FOR_TIME'
        ? forTimeUseCap
          ? `타임캡 ${forTimeCapMin}분`
          : null
        : type === 'EMOM'
          ? `${emomRounds}라운드 × ${emomMinPerRound}분`
          : `${tabataWork}초 / ${tabataRest}초 × ${tabataRounds}라운드`;

  // 현재 구간 진행률 (시간이 갈수록 채워지는 진행바용, 0~1)
  const segmentConfig = configRef.current;
  let segmentProgress: number | null = null;
  if (segmentConfig) {
    if (type === 'AMRAP') {
      segmentProgress = (segmentConfig.amrapTotalSec - state.secondsLeft) / segmentConfig.amrapTotalSec;
    } else if (type === 'EMOM') {
      segmentProgress = (segmentConfig.emomSecPerRound - state.secondsLeft) / segmentConfig.emomSecPerRound;
    } else if (type === 'TABATA') {
      const phaseTotal = state.tabataPhase === 'work' ? segmentConfig.tabataWorkSec : segmentConfig.tabataRestSec;
      segmentProgress = (phaseTotal - state.secondsLeft) / phaseTotal;
    } else if (type === 'FOR_TIME') {
      // 타임캡이 없으면 정해진 전체 시간이 없으므로, 스톱워치 초침처럼 60초에 한 바퀴 돌게 함
      segmentProgress = segmentConfig.forTimeUseCap
        ? state.secondsElapsed / segmentConfig.forTimeCapSec
        : (state.secondsElapsed % 60) / 60;
    }
  }

  // AMRAP 라운드 카운터: 원형 버튼 하나. 탭하면 +1, 길게 누르면 -1 (실수 정정)
  const renderRoundCounter = () => (
    <View style={styles.roundCounterWrap}>
      <Pressable
        style={({ pressed }) => [
          styles.roundBtn,
          {
            width: roundBtnSize,
            height: roundBtnSize,
            borderRadius: roundBtnSize / 2,
            borderColor: accent,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
        onPress={() => dispatch({ type: 'INC_ROUND' })}
        onLongPress={() => dispatch({ type: 'DEC_ROUND' })}
      >
        <Text
          style={[styles.roundBtnValue, { fontSize: roundBtnValueSize, color: accent }]}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {state.round}
        </Text>
      </Pressable>
      <Text
        style={[styles.roundBtnCaption, { fontSize: roundBtnCaptionSize, color: RUN_TEXT_DIM }]}
        maxFontSizeMultiplier={1.2}
      >
        라운드 +
      </Text>
    </View>
  );

  // 가운데 숫자를 눌러 일시정지/재개. 일시정지 중에는 숫자 대신 ❚❚ 표시
  const renderBigTime = (extraStyle?: object) => (
    <Pressable
      onPress={() => dispatch({ type: isPaused ? 'RESUME' : 'PAUSE' })}
      style={styles.bigTimePress}
      hitSlop={12}
    >
      {isPaused ? (
        <Text
          style={[styles.pauseIndicator, { fontSize: pauseIndicatorSize * 2.6, color: accent }, extraStyle]}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          ❚❚
        </Text>
      ) : (
        <Text
          style={[styles.bigTime, { fontSize: bigTimeFontSize, color: bigTimeColor }, extraStyle]}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {bigTime}
        </Text>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: RUN_BG }]}>
      <View style={[styles.header, { paddingVertical: headerPaddingVertical }]}>
        <Pressable onPress={handleReset} hitSlop={8}>
          <Text style={[styles.backText, { fontSize: ms(16), color: RUN_TEXT_DIM }]} maxFontSizeMultiplier={1.2}>
            ✕ 리셋
          </Text>
        </Pressable>
        {!isLandscape && (
          <Text
            style={[styles.headerTitle, { fontSize: ms(22), color: accent }]}
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
        )}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.timerBody, isLandscape && { paddingBottom: ms(28) }, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 위 zone: EMOM/TABATA는 "1/10"만, AMRAP/FOR TIME은 총 설정 시간만 — 아래 zone과 같은 flex를 줘서 가운데가 화면 정중앙에 옴 */}
        <View
          style={[
            styles.zoneTop,
            {
              gap: timerBodyGap,
              paddingBottom: topZonePadding,
              minHeight: topZoneHasContent
                ? Math.max(roundLabelValueSize * 1.5, totalCaptionSize * 1.3) + topZonePadding
                : topZonePadding,
            },
          ]}
        >
          {(type === 'EMOM' || type === 'TABATA') ? (
            !isDone && (
              <Text
                style={[
                  styles.roundLabelValue,
                  { fontSize: roundLabelValueSize, lineHeight: roundLabelValueSize * 1.5, color: RUN_TEXT },
                ]}
                allowFontScaling={false}
                maxFontSizeMultiplier={1.2}
              >
                {state.round} / {totalRounds}
              </Text>
            )
          ) : (
            !isDone && !isLandscape && totalCaption !== null && (
              <Text
                style={[styles.totalCaption, { fontSize: totalCaptionSize, color: RUN_TEXT }]}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {totalCaption}
              </Text>
            )
          )}
        </View>

        {/* 가운데 zone: 세로 = 눈금 링 안에 숫자 / 가로 = 숫자 + 점선 트랙 */}
        <View style={styles.zoneCenter} onLayout={handleCenterLayout}>
          {isDone ? (
            <View style={styles.doneContainer}>
              <Text style={[styles.doneEmoji]}>🏆</Text>
              <Text style={[styles.doneTitle, { color: accent }]} maxFontSizeMultiplier={1.2}>완료!</Text>
              {type === 'AMRAP' && (
                <Text style={[styles.doneResult, { color: RUN_TEXT }]} maxFontSizeMultiplier={1.2}>
                  {state.round}라운드
                </Text>
              )}
              {type === 'FOR_TIME' && (
                <Text style={[styles.doneResult, { color: RUN_TEXT }]} maxFontSizeMultiplier={1.2}>
                  기록: {formatTime(state.secondsElapsed)}
                </Text>
              )}
              {type === 'EMOM' && (
                <Text style={[styles.doneResult, { color: RUN_TEXT }]} maxFontSizeMultiplier={1.2}>
                  {emomRounds}라운드 완료
                </Text>
              )}
              {type === 'TABATA' && (
                <Text style={[styles.doneResult, { color: RUN_TEXT }]} maxFontSizeMultiplier={1.2}>
                  {tabataRounds}라운드 완료
                </Text>
              )}
            </View>
          ) : isLandscape ? (
            /* 가로모드: 숫자는 화면 정중앙, 라운드 버튼은 오른쪽 절대배치라 중앙 정렬을 깨지 않음 */
            <View style={styles.landscapeRow}>
              <View style={[styles.landscapeTimeCol, { maxWidth: width - 2 * (roundBtnSize + ms(48)) }]}>
                {renderBigTime()}
              </View>
              {(type === 'AMRAP' || type === 'FOR_TIME') && (
                <View style={styles.landscapeRoundCounter}>{renderRoundCounter()}</View>
              )}
            </View>
          ) : (
            /* 세로모드: 이어지는 원형 링 안에 시간 숫자. 라운드 버튼은 겹치지 않도록 링 "아래" 오른쪽에 별도로 배치 */
            <>
              <View style={styles.portraitRingRow}>
                <ProgressRing
                  progress={segmentProgress ?? 0}
                  color={accent}
                  size={ringSize}
                  thickness={ringThickness}
                >
                  {renderBigTime({ width: ringSize * 0.72 })}
                </ProgressRing>
              </View>
              {(type === 'AMRAP' || type === 'FOR_TIME') && (
                <View style={styles.portraitRoundCounterRow}>{renderRoundCounter()}</View>
              )}
            </>
          )}
        </View>

        {/* 아래 zone: FOR TIME 완료 버튼 / 완료 후 다시 시작 (일시정지는 가운데 숫자 탭으로 대체) */}
        <View
          style={[
            styles.zoneBottom,
            { gap: timerBodyGap, paddingTop: bottomZonePadding, minHeight: bottomZoneMinHeight },
          ]}
        >
          {!isDone && (
            <View style={styles.controls}>
              {type === 'FOR_TIME' && (
                <Pressable
                  style={({ pressed }) => [styles.doneBtn, { height: doneBtnHeight, backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => dispatch({ type: 'MANUAL_DONE' })}
                >
                  <Text style={[styles.doneBtnText, { fontSize: doneBtnFontSize }]} maxFontSizeMultiplier={1.2}>완료!</Text>
                </Pressable>
              )}
            </View>
          )}

          {isDone && (
            <Pressable
              style={({ pressed }) => [
                styles.restartBtn,
                { height: restartBtnHeight, backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleReset}
            >
              <Text
                style={[styles.startBtnText, { fontSize: isLandscape ? ms(16) : ms(21) }]}
                maxFontSizeMultiplier={1.2}
              >
                다시 시작
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backText: { fontWeight: '500' },
  headerTitle: { fontWeight: '800', letterSpacing: 1, flexShrink: 1, textAlign: 'center' },
  headerSpacer: { width: 60 },

  // Setup
  setupContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D0D0D5',
    marginBottom: 22,
  },
  toggleLabel: { fontSize: 17, fontWeight: '600' },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C7C7CC',
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  infoBox: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: { fontSize: 16, fontWeight: '500' },
  startBtn: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  startBtnText: { fontWeight: '700', color: '#fff' },

  // Pre-start countdown
  preStartLabel: { fontSize: 20, fontWeight: '500', marginBottom: 8 },
  preStartCount: {
    fontWeight: '200',
    letterSpacing: -6,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },

  // Running
  timerBody: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    overflow: 'visible',
  },
  preStartBody: { justifyContent: 'center' },
  // 위/아래 zone에 같은 flex를 줘서 가운데 zone(큰 시간 숫자)이 화면 정중앙에 오게 함
  zoneTop: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  zoneCenter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'visible',
  },
  zoneBottom: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    overflow: 'visible',
  },
  // 시간 숫자는 화면 정중앙에 두고, 라운드 버튼만 오른쪽에 절대배치해서 중앙 정렬을 흐트러뜨리지 않음
  landscapeRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeTimeCol: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  landscapeRoundCounter: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  // 세로모드: 링은 화면 정중앙. 라운드 버튼은 겹치지 않도록 절대배치 대신 링 아래 별도 줄에 오른쪽 정렬
  portraitRingRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitRoundCounterRow: {
    width: '100%',
    alignItems: 'flex-end',
    paddingRight: '8%',
  },
  totalCaption: { fontWeight: '700', textAlign: 'center' },
  roundLabelValue: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  bigTimePress: { alignItems: 'center', justifyContent: 'center' },
  bigTime: {
    fontWeight: '800',
    letterSpacing: -5,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  pauseIndicator: { fontWeight: '800', textAlign: 'center', letterSpacing: 4 },

  // Done
  doneContainer: { alignItems: 'center', gap: 10 },
  doneEmoji: { fontSize: 60 },
  doneTitle: { fontSize: 52, fontWeight: '800' },
  doneResult: { fontSize: 27, fontWeight: '600', marginTop: 4 },

  // AMRAP 라운드 카운터 (참고 앱의 원형 버튼)
  roundCounterWrap: { alignItems: 'center', gap: 6 },
  roundBtn: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnValue: { fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center' },
  roundBtnCaption: { fontWeight: '500', textAlign: 'center' },

  // Bottom controls
  controls: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  doneBtn: {
    height: 58,
    paddingHorizontal: 32,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  restartBtn: {
    height: 60,
    paddingHorizontal: 48,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
