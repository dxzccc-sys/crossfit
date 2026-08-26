import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useResponsive } from '@/constants/layout';
import { TYPE_COLORS, TYPE_LABELS, type TimerType } from '@/constants/timer';
import { BENCHMARK_WODS } from '@/data/benchmarkWods';

const TIMER_TYPES: {
  type: TimerType;
  label: string;
  sub: string;
  description: string;
  color: string;
}[] = [
  {
    type: 'AMRAP',
    label: TYPE_LABELS.AMRAP,
    sub: 'As Many Rounds As Possible',
    description: '정해진 시간 안에 최대 라운드',
    color: TYPE_COLORS.AMRAP,
  },
  {
    type: 'FOR_TIME',
    label: TYPE_LABELS.FOR_TIME,
    sub: 'Complete As Fast As Possible',
    description: '가능한 빠르게 동작 완료하기',
    color: TYPE_COLORS.FOR_TIME,
  },
  {
    type: 'EMOM',
    label: TYPE_LABELS.EMOM,
    sub: 'Every Minute On the Minute',
    description: '매 분 시작 시 정해진 동작 반복',
    color: TYPE_COLORS.EMOM,
  },
  {
    type: 'TABATA',
    label: TYPE_LABELS.TABATA,
    sub: '20s Work / 10s Rest × 8',
    description: '고강도 인터벌 트레이닝',
    color: TYPE_COLORS.TABATA,
  },
];

/** 홈 카드 한 장. 이동 경로가 카드마다 달라서(타이머 vs WOD 목록) 동작을 항목이 직접 들고 있다 */
type HomeCard = {
  key: string;
  label: string;
  sub: string;
  description: string;
  color: string;
  onPress: () => void;
};

/** WOD 카드 색 — 기존 WOD 배너의 금색을 승계. TYPE_COLORS 4색과 겹치지 않는다 */
const WOD_COLOR = '#FFB000';

const HOME_CARDS: HomeCard[] = [
  {
    key: 'WOD',
    label: 'WOD',
    sub: 'Workout Of the Day',
    description: `유명 벤치마크 와드 ${BENCHMARK_WODS.length}종`,
    color: WOD_COLOR,
    onPress: () => router.push('/wods'),
  },
  ...TIMER_TYPES.map((t) => ({
    key: t.type,
    label: t.label,
    sub: t.sub,
    description: t.description,
    color: t.color,
    onPress: () => router.push({ pathname: '/timer' as const, params: { type: t.type } }),
  })),
];

function Card({
  item,
  compact,
  ms,
  style,
}: {
  item: HomeCard;
  compact: boolean;
  ms: (size: number) => number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        style,
        { backgroundColor: item.color, opacity: pressed ? 0.85 : 1, padding: compact ? ms(14) : ms(16) },
      ]}
      onPress={item.onPress}
    >
      <Text style={[styles.cardLabel, { fontSize: compact ? ms(19) : ms(26) }]} maxFontSizeMultiplier={1.2}>
        {item.label}
      </Text>
      <Text
        style={[styles.cardSub, { fontSize: compact ? ms(11) : ms(12) }]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
      >
        {item.sub}
      </Text>
      {!compact && (
        <Text style={[styles.cardDesc, { fontSize: ms(14) }]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {item.description}
        </Text>
      )}
    </Pressable>
  );
}

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { isLandscape, ms } = useResponsive();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, isLandscape && styles.headerCompact]}>
        <Text
          style={[styles.title, { fontSize: isLandscape ? ms(20) : ms(34) }, { color: colors.text }]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          CrossFit Timer
        </Text>
      </View>

      {isLandscape ? (
        /* 가로: WOD가 윗줄을 전체 폭으로 쓰고, 그 아래 타이머 4종이 2×2로 들어간다 */
        <View style={styles.gridLandscape}>
          <View style={styles.gridRow}>
            <Card item={HOME_CARDS[0]} compact ms={ms} style={{ flex: 1 }} />
          </View>
          <View style={styles.gridRow}>
            <Card item={HOME_CARDS[1]} compact ms={ms} style={{ flex: 1 }} />
            <Card item={HOME_CARDS[2]} compact ms={ms} style={{ flex: 1 }} />
          </View>
          <View style={styles.gridRow}>
            <Card item={HOME_CARDS[3]} compact ms={ms} style={{ flex: 1 }} />
            <Card item={HOME_CARDS[4]} compact ms={ms} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={styles.grid}>
          {HOME_CARDS.map((item) => (
            <Card key={item.key} item={item} compact={false} ms={ms} />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerCompact: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  grid: {
    flex: 1,
    // 카드가 5장이라 간격을 줄여 작은 기기에서도 카드 안 글자가 넘치지 않게 한다
    gap: 10,
    paddingBottom: 20,
  },
  gridLandscape: {
    flex: 1,
    gap: 10,
    paddingBottom: 12,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'flex-end',
  },
  cardLabel: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
});
