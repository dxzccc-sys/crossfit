import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useResponsive } from '@/constants/layout';
import { TYPE_COLORS, TYPE_LABELS } from '@/constants/timer';
import { SCORE_UNIT_HINT, findWod, type BenchmarkWod, type WodTier } from '@/data/benchmarkWods';

/** 등급이 높을수록 배경을 진하게 — 사다리를 올라가는 느낌을 주기 위한 단계값 */
const TIER_INTENSITY: Record<WodTier['key'], number> = {
  beginner: 0.08,
  intermediate: 0.14,
  advanced: 0.22,
  elite: 0.34,
};

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** WOD의 프리필 값을 타이머 라우트 파라미터(문자열)로 변환 */
function buildTimerParams(wod: BenchmarkWod): Record<string, string> {
  const params: Record<string, string> = { type: wod.timerType, wod: wod.name };
  const p = wod.prefill;
  if (!p) return params;
  if (p.amrapMin !== undefined) params.amrapMin = String(p.amrapMin);
  if (p.emomRounds !== undefined) params.emomRounds = String(p.emomRounds);
  if (p.emomMin !== undefined) params.emomMin = String(p.emomMin);
  if (p.tabataWork !== undefined) params.tabataWork = String(p.tabataWork);
  if (p.tabataRest !== undefined) params.tabataRest = String(p.tabataRest);
  if (p.tabataRounds !== undefined) params.tabataRounds = String(p.tabataRounds);
  return params;
}

function Section({
  title,
  children,
  ms,
  color,
}: {
  title: string;
  children: React.ReactNode;
  ms: (size: number) => number;
  color: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: ms(13), color }]} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function WodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { ms, isLandscape } = useResponsive();

  const wod = findWod(Array.isArray(id) ? id[0] : id);

  const borderColor = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const blockBg = colors.backgroundElement;

  if (!wod) {
    return (
      <SafeAreaView style={[styles.container, styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { fontSize: ms(16), color: colors.text }]} maxFontSizeMultiplier={1.2}>
          WOD를 찾을 수 없습니다.
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backBtn, { fontSize: ms(16), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            ← 뒤로
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const accent = TYPE_COLORS[wod.timerType];
  // 등급표는 위로 갈수록 높은 등급이 되도록 뒤집어 그린다 (올라갈 칸이 눈에 보이게)
  const tiersDescending = [...wod.tiers].reverse();

  // 라운드/1R 구성/중량 — 값이 있는 것만 운동 구성 블록 하단에 붙인다
  const metaRows: { label: string; value: string }[] = [];
  if (wod.roundsNote) metaRows.push({ label: '라운드', value: wod.roundsNote });
  if (wod.roundBreakdown) metaRows.push({ label: '1R 구성', value: wod.roundBreakdown });
  if (wod.weightNote) metaRows.push({ label: '중량', value: wod.weightNote });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingVertical: isLandscape ? ms(6) : ms(14) }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backBtn, { fontSize: ms(16), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            ← 뒤로
          </Text>
        </Pressable>
        <Text
          style={[styles.headerTitle, { fontSize: ms(20), color: colors.text }]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {wod.name.toUpperCase()}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 히어로 */}
        <View style={[styles.hero, { backgroundColor: hexToRgba(accent, 0.12), borderColor: hexToRgba(accent, 0.35) }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.chip, { backgroundColor: accent }]}>
              <Text style={[styles.chipText, { fontSize: ms(11) }]} maxFontSizeMultiplier={1.2}>
                {TYPE_LABELS[wod.timerType]}
              </Text>
            </View>
            {wod.category === 'hero' && (
              <View style={[styles.badge, { borderColor: accent }]}>
                <Text style={[styles.badgeText, { fontSize: ms(10), color: accent }]} maxFontSizeMultiplier={1.2}>
                  HERO WOD
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroTagline, { fontSize: ms(15), color: colors.text }]} maxFontSizeMultiplier={1.2}>
            {wod.tagline}
          </Text>
        </View>

        {/* 운동 구성 — 동작/횟수 표 아래에 라운드 구조와 중량을 함께 넣는다 */}
        <Section title="운동 구성" ms={ms} color={colors.textSecondary}>
          <View style={[styles.block, { backgroundColor: blockBg, borderColor }]}>
            {wod.prescription.map((line, i) => (
              <View
                key={`${line.movement}-${i}`}
                style={[styles.presRow, i > 0 && { borderTopWidth: 1, borderTopColor: borderColor }]}
              >
                <Text
                  style={[styles.presMovement, { fontSize: ms(15), color: colors.text }]}
                  maxFontSizeMultiplier={1.2}
                >
                  {line.movement}
                </Text>
                <Text
                  style={[styles.presDetail, { fontSize: ms(14), color: colors.textSecondary }]}
                  maxFontSizeMultiplier={1.2}
                >
                  {line.detail}
                </Text>
              </View>
            ))}

            {metaRows.map(({ label, value }) => (
              <View key={label} style={[styles.metaRow, { borderTopWidth: 1, borderTopColor: borderColor }]}>
                <Text style={[styles.metaLabel, { fontSize: ms(11.5), color: accent }]} maxFontSizeMultiplier={1.2}>
                  {label}
                </Text>
                <Text
                  style={[styles.metaValue, { fontSize: ms(13.5), color: colors.text }]}
                  maxFontSizeMultiplier={1.2}
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>
          {wod.rxNote && (
            <Text style={[styles.note, { fontSize: ms(13), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
              {wod.rxNote}
            </Text>
          )}
        </Section>

        {/* 등급표 — 이 화면의 핵심 */}
        <Section title="기록별 등급" ms={ms} color={colors.textSecondary}>
          <Text style={[styles.scoreHint, { fontSize: ms(13), color: accent }]} maxFontSizeMultiplier={1.2}>
            {SCORE_UNIT_HINT[wod.scoreUnit]}
          </Text>

          <View style={styles.ladder}>
            {tiersDescending.map((tier, i) => {
              const isTop = i === 0;
              return (
                <View
                  key={tier.key}
                  style={[
                    styles.tierRow,
                    {
                      backgroundColor: hexToRgba(accent, TIER_INTENSITY[tier.key]),
                      borderColor: isTop ? accent : hexToRgba(accent, 0.25),
                      borderWidth: isTop ? 2 : 1,
                      padding: ms(14),
                    },
                  ]}
                >
                  <View style={styles.tierHeadRow}>
                    <Text
                      style={[styles.tierLabel, { fontSize: ms(15), color: colors.text }]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {isTop && '👑 '}
                      {tier.label}
                    </Text>
                    <Text
                      style={[styles.tierRange, { fontSize: ms(16), color: accent }]}
                      maxFontSizeMultiplier={1.2}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {tier.range}
                    </Text>
                  </View>
                  <Text
                    style={[styles.tierBlurb, { fontSize: ms(12.5), color: colors.textSecondary }]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {tier.blurb}
                  </Text>
                </View>
              );
            })}
          </View>

          {wod.tiersNote && (
            <Text style={[styles.note, { fontSize: ms(12.5), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
              {wod.tiersNote}
            </Text>
          )}
          <Text style={[styles.sourceLine, { fontSize: ms(11.5), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            등급 기준 출처: {wod.tierSource}
          </Text>
        </Section>

        {/* 유래 */}
        {wod.story && (
          <Section title="유래" ms={ms} color={colors.textSecondary}>
            <Text style={[styles.paragraph, { fontSize: ms(13.5), color: colors.text }]} maxFontSizeMultiplier={1.2}>
              {wod.story}
            </Text>
          </Section>
        )}

        {/* 참고 */}
        {(wod.cutoffNote || wod.scaling) && (
          <Section title="참고" ms={ms} color={colors.textSecondary}>
            {wod.cutoffNote && (
              <Text
                style={[styles.paragraph, { fontSize: ms(13), color: colors.textSecondary }]}
                maxFontSizeMultiplier={1.2}
              >
                • {wod.cutoffNote}
              </Text>
            )}
            {wod.scaling && (
              <Text
                style={[styles.paragraph, { fontSize: ms(13), color: colors.textSecondary }]}
                maxFontSizeMultiplier={1.2}
              >
                • 스케일: {wod.scaling}
              </Text>
            )}
          </Section>
        )}

        <Text style={[styles.sourceLine, { fontSize: ms(11.5), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
          처방 출처: CrossFit.com 공식 WOD 페이지 · CrossFit Journal 「Benchmark Workouts」
        </Text>
      </ScrollView>

      {/* 하단 고정 시작 버튼 */}
      <View style={[styles.footer, { borderTopColor: borderColor, paddingBottom: ms(8) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: accent, opacity: pressed ? 0.85 : 1, height: isLandscape ? ms(44) : ms(56) },
          ]}
          onPress={() => router.push({ pathname: '/timer', params: buildTimerParams(wod) })}
        >
          <Text style={[styles.startBtnText, { fontSize: ms(17) }]} maxFontSizeMultiplier={1.2}>
            이 WOD로 타이머 시작
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notFound: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  notFoundText: {
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    fontWeight: '600',
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  headerSpacer: {
    width: 56,
  },
  body: {
    paddingBottom: 20,
    gap: 20,
  },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTagline: {
    fontWeight: '600',
    lineHeight: 22,
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  block: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  presRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  presMovement: {
    fontWeight: '700',
    flexShrink: 1,
  },
  presDetail: {
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  // 라운드/1R 구성/중량 — 동작 표와 같은 블록 안에 세로로 쌓는다 (값이 길어 한 줄에 안 들어감)
  metaRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 3,
  },
  metaLabel: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metaValue: {
    fontWeight: '600',
    lineHeight: 19,
  },
  note: {
    lineHeight: 19,
  },
  scoreHint: {
    fontWeight: '700',
  },
  ladder: {
    gap: 8,
  },
  tierRow: {
    borderRadius: 14,
    gap: 5,
  },
  tierHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tierLabel: {
    fontWeight: '800',
    flexShrink: 1,
  },
  tierRange: {
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  tierBlurb: {
    lineHeight: 18,
  },
  paragraph: {
    lineHeight: 21,
  },
  sourceLine: {
    lineHeight: 17,
    opacity: 0.7,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  startBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
