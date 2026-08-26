import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useResponsive } from '@/constants/layout';
import { TYPE_COLORS, TYPE_LABELS } from '@/constants/timer';
import { BENCHMARK_WODS, type BenchmarkWod } from '@/data/benchmarkWods';

const CATEGORY_BADGE: Partial<Record<BenchmarkWod['category'], string>> = {
  hero: 'HERO',
};

function WodCard({
  wod,
  ms,
  textColor,
  subColor,
  cardBg,
  borderColor,
}: {
  wod: BenchmarkWod;
  ms: (size: number) => number;
  textColor: string;
  subColor: string;
  cardBg: string;
  borderColor: string;
}) {
  const accent = TYPE_COLORS[wod.timerType];
  const badge = CATEGORY_BADGE[wod.category];
  // 목록에서는 처방을 두 줄까지만 요약해서 보여준다 (중량 등 자세한 내용은 상세 화면에서)
  const movements = wod.prescription
    .slice(0, 3)
    .map((p) => `${p.movement} ${p.detail}`)
    .join(' · ');
  const summary = wod.roundsNote ? `${wod.roundsNote} — ${movements}` : movements;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.7 : 1, padding: ms(16) },
      ]}
      onPress={() => router.push({ pathname: '/wod/[id]', params: { id: wod.id } })}
    >
      <View style={styles.cardTopRow}>
        <Text
          style={[styles.cardName, { fontSize: ms(20), color: textColor }]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {wod.name.toUpperCase()}
        </Text>
        <View style={styles.cardChips}>
          {badge && (
            <View style={[styles.badge, { borderColor: accent }]}>
              <Text style={[styles.badgeText, { fontSize: ms(10), color: accent }]} maxFontSizeMultiplier={1.2}>
                {badge}
              </Text>
            </View>
          )}
          <View style={[styles.chip, { backgroundColor: accent }]}>
            <Text style={[styles.chipText, { fontSize: ms(11) }]} maxFontSizeMultiplier={1.2}>
              {TYPE_LABELS[wod.timerType]}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.cardTagline, { fontSize: ms(13), color: subColor }]} maxFontSizeMultiplier={1.2}>
        {wod.tagline}
      </Text>

      <Text
        style={[styles.cardSummary, { fontSize: ms(12), color: subColor }]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={2}
      >
        {summary}
      </Text>
    </Pressable>
  );
}

export default function WodsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { ms, isLandscape } = useResponsive();

  const cardBg = colors.backgroundElement;
  const borderColor = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingVertical: isLandscape ? ms(6) : ms(14) }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backBtn, { fontSize: ms(16), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
            ← 뒤로
          </Text>
        </Pressable>
        <Text
          style={[styles.headerTitle, { fontSize: ms(22), color: colors.text }]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          WOD
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: ms(28) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { fontSize: ms(13), color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
          크로스핏에서 실력을 재는 기준이 되는 벤치마크 WOD입니다. 하나를 골라 어떤 운동인지와 기록별 등급을 확인하고,
          바로 타이머를 시작할 수 있습니다.
        </Text>

        {BENCHMARK_WODS.map((wod) => (
          <WodCard
            key={wod.id}
            wod={wod}
            ms={ms}
            textColor={colors.text}
            subColor={colors.textSecondary}
            cardBg={cardBg}
            borderColor={borderColor}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
  },
  // 뒤로 버튼과 좌우 균형을 맞춰 제목이 정확히 가운데 오도록
  headerSpacer: {
    width: 56,
  },
  list: {
    gap: 12,
  },
  intro: {
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    fontWeight: '800',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  cardChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  cardTagline: {
    fontWeight: '500',
    lineHeight: 18,
  },
  cardSummary: {
    lineHeight: 16,
    opacity: 0.75,
  },
});
