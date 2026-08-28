import { forwardRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import type { AppLanguage } from "@/lib/i18n";
import {
  trainingStoryCopy,
  type TrainingStoryData,
} from "@/lib/training-story";

const wordmark = require("../assets/images/zaymax-wordmark.png");

export const TrainingStory = forwardRef<
  View,
  {
    data: TrainingStoryData;
    language: AppLanguage;
  }
>(function TrainingStory({ data, language }, ref) {
  const copy = trainingStoryCopy(data, language);
  const hasPersonalBest = data.personalBestCount > 0;

  return (
    <View ref={ref} collapsable={false} style={styles.story}>
      <View style={styles.orbitLarge} />
      <View style={styles.orbitSmall} />

      <View>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text numberOfLines={3} adjustsFontSizeToFit style={styles.title}>
          {data.workoutTitle.toUpperCase()}
        </Text>
      </View>

      <View style={styles.durationBlock}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          style={styles.duration}
        >
          {copy.minutes}
        </Text>
        <Text style={styles.minuteLabel}>{copy.minuteLabel}</Text>
      </View>

      <View style={styles.statsRow}>
        <StoryMetric value={data.exerciseCount} label={copy.exerciseLabel} />
        <View style={styles.divider} />
        <StoryMetric value={data.completedSets} label={copy.setLabel} />
      </View>

      <View>
        <View
          style={[
            styles.bestCard,
            hasPersonalBest ? styles.bestCardProgress : null,
          ]}
        >
          <View
            style={[
              styles.bestDot,
              hasPersonalBest ? styles.bestDotProgress : null,
            ]}
          />
          <Text style={styles.bestText}>
            {data.personalBestCount} {copy.bestLabel}
          </Text>
        </View>
        {data.skippedExerciseCount > 0 ? (
          <Text style={styles.skippedText}>
            {data.skippedExerciseCount} {copy.skippedLabel}
          </Text>
        ) : null}
        <Image source={wordmark} resizeMode="contain" style={styles.wordmark} />
      </View>
    </View>
  );
});

function StoryMetric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  story: {
    width: "100%",
    aspectRatio: 9 / 16,
    justifyContent: "space-between",
    overflow: "hidden",
    backgroundColor: ZAYMAX_DESIGN.colors.background,
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 30,
  },
  orbitLarge: {
    position: "absolute",
    top: 145,
    right: -96,
    width: 260,
    height: 260,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ZAYMAX_DESIGN.colors.borderStrong,
  },
  orbitSmall: {
    position: "absolute",
    top: 197,
    right: -44,
    width: 156,
    height: 156,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245, 245, 246, 0.12)",
  },
  eyebrow: {
    color: ZAYMAX_DESIGN.colors.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  title: {
    marginTop: 12,
    maxWidth: "88%",
    color: ZAYMAX_DESIGN.colors.action,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1.1,
    lineHeight: 39,
  },
  durationBlock: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  duration: {
    maxWidth: "82%",
    color: ZAYMAX_DESIGN.colors.action,
    fontSize: 94,
    fontWeight: "200",
    letterSpacing: -6,
    lineHeight: 102,
  },
  minuteLabel: {
    marginBottom: 17,
    marginLeft: 10,
    color: ZAYMAX_DESIGN.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  statsRow: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: ZAYMAX_DESIGN.radius.nested,
    borderWidth: 1,
    borderColor: ZAYMAX_DESIGN.colors.border,
    backgroundColor: ZAYMAX_DESIGN.colors.surface,
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    color: ZAYMAX_DESIGN.colors.action,
    fontSize: 28,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 3,
    color: ZAYMAX_DESIGN.colors.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  divider: {
    width: 1,
    height: 42,
    backgroundColor: ZAYMAX_DESIGN.colors.border,
  },
  bestCard: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: ZAYMAX_DESIGN.radius.round,
    borderWidth: 1,
    borderColor: ZAYMAX_DESIGN.colors.border,
    backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
    paddingHorizontal: 16,
  },
  bestCardProgress: {
    borderColor: ZAYMAX_DESIGN.colors.goldLine,
    backgroundColor: ZAYMAX_DESIGN.colors.goldSoft,
  },
  bestDot: {
    width: 7,
    height: 7,
    marginRight: 9,
    borderRadius: 999,
    backgroundColor: ZAYMAX_DESIGN.colors.muted,
  },
  bestDotProgress: {
    backgroundColor: ZAYMAX_DESIGN.colors.gold,
  },
  bestText: {
    color: ZAYMAX_DESIGN.colors.action,
    fontSize: 13,
    fontWeight: "900",
  },
  skippedText: {
    marginTop: 9,
    color: ZAYMAX_DESIGN.colors.muted,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  wordmark: {
    width: 142,
    height: 24,
    marginTop: 23,
    alignSelf: "center",
  },
});
