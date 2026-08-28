import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { GlassMaterial } from "@/components/glass-material";
import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import {
  displayWeight,
  formatDateTime,
  loadSettings,
  loadWorkoutHistory,
  type WeightUnit,
  type WorkoutHistoryEntry,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";
import { hapticTap } from "@/lib/haptics";
import { useLanguage, type AppLanguage } from "@/lib/i18n";
import { formatWorkoutDuration } from "@/lib/workout-duration";

const PROGRESS_GOLD = ZAYMAX_DESIGN.colors.gold;

export default function TrainingHistoryScreen() {
  const colors = useColors("dark");
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  const refresh = useCallback(async () => {
    const [entries, settings] = await Promise.all([
      loadWorkoutHistory(),
      loadSettings(),
    ]);
    setHistory(entries);
    setWeightUnit(settings.weightUnit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        // Keep the last rendered history if local storage is temporarily unavailable.
      });
    }, [refresh]),
  );

  const overview = useMemo(
    () => ({
      totalVolumeKg: history.reduce(
        (sum, entry) => sum + (entry.totalVolumeKg ?? 0),
        0,
      ),
      personalBests: history.reduce(
        (sum, entry) => sum + (entry.personalBestCount ?? 0),
        0,
      ),
    }),
    [history],
  );

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-center pt-3 pb-7">
              <ZaymaxWatermark />
              <Pressable
                accessibilityLabel={t("Zurück", "Back")}
                onPress={() => {
                  hapticTap();
                  router.back();
                }}
                style={({ pressed }) => [
                  {
                    padding: 8,
                    marginRight: 6,
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <IconSymbol
                  name="chevron.right"
                  size={22}
                  color={colors.foreground}
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </Pressable>
              <View className="flex-1">
                <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                  {t("DEINE LEISTUNG", "YOUR PERFORMANCE")}
                </Text>
                <Text className="mt-1 text-3xl font-black text-foreground">
                  {t("Historie", "History")}
                </Text>
                <Text className="mt-2 text-base text-muted">
                  {t(
                    "Deine Entwicklung auf einen Blick.",
                    "Your development at a glance.",
                  )}
                </Text>
              </View>
              <IconSymbol
                name="book.closed.fill"
                size={24}
                color={colors.primary}
              />
            </View>
            {history.length ? (
              <HistoryOverview
                history={history}
                totalVolumeKg={overview.totalVolumeKg}
                personalBests={overview.personalBests}
                unit={weightUnit}
                colors={colors}
              />
            ) : null}
            {history.length ? (
              <Text className="mt-8 mb-3 text-xl font-black text-foreground">
                {t("Letzte Trainings", "Recent workouts")}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-1 items-center justify-center bg-surface/80 p-7"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: ZAYMAX_DESIGN.radius.card,
            }}
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-background">
              <IconSymbol
                name="book.closed.fill"
                size={26}
                color={colors.foreground}
              />
            </View>
            <Text className="mt-4 text-center text-lg font-black text-foreground">
              {t("Noch keine Einträge", "No entries yet")}
            </Text>
            <Text className="mt-2 text-center leading-5 text-muted">
              {t(
                "Beende ein Training, um deine Sätze, Wiederholungen und Gewichte hier zu sehen.",
                "Finish a workout to see your sets, repetitions and weights here.",
              )}
            </Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <HistoryCard
            entry={item}
            index={index}
            unit={weightUnit}
            locale={locale}
            colors={colors}
            onOpenExercise={(exerciseId, name) =>
              router.push({
                pathname: "/exercise-history",
                params: { exerciseId, name },
              } as unknown as Href)
            }
          />
        )}
      />
    </ScreenContainer>
  );
}

function HistoryOverview({
  history,
  totalVolumeKg,
  personalBests,
  unit,
  colors,
}: {
  history: WorkoutHistoryEntry[];
  totalVolumeKg: number;
  personalBests: number;
  unit: WeightUnit;
  colors: any;
}) {
  const { t } = useLanguage();
  const recent = history.slice(0, 7).reverse();
  const values = recent.map((entry) => entry.totalVolumeKg ?? 0);
  const max = Math.max(1, ...values);
  const width = 320;
  const height = 84;
  const horizontalPadding = 10;
  const verticalPadding = 12;
  const step =
    values.length > 1
      ? (width - horizontalPadding * 2) / (values.length - 1)
      : 0;
  const points = values
    .map(
      (value, index) =>
        `${horizontalPadding + index * step},${height - verticalPadding - (value / max) * (height - verticalPadding * 2)}`,
    )
    .join(" ");

  return (
    <Animated.View
      entering={FadeIn.duration(ZAYMAX_DESIGN.motion.standard)}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: ZAYMAX_DESIGN.radius.hero,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "transparent",
        padding: 18,
        ...ZAYMAX_DESIGN.shadow,
      }}
    >
      <GlassMaterial raised intensity={28} radius={ZAYMAX_DESIGN.radius.hero} />
      <Text className="text-[10px] font-black uppercase tracking-[2.5px] text-muted">
        {t("ÜBERSICHT", "OVERVIEW")}
      </Text>
      <View className="mt-4 flex-row gap-2">
        <HistoryMetric
          label={t("Trainings", "Workouts")}
          value={String(history.length)}
          colors={colors}
        />
        <HistoryMetric
          label={t("Volumen", "Volume")}
          value={displayWeight(totalVolumeKg, unit)}
          colors={colors}
        />
        <HistoryMetric
          label={t("Bestleistungen", "Personal bests")}
          value={String(personalBests)}
          colors={colors}
          accent
        />
      </View>
      <View
        style={{
          marginTop: 17,
          height: 92,
          borderRadius: ZAYMAX_DESIGN.radius.nested,
          backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
          overflow: "hidden",
          paddingHorizontal: 6,
        }}
      >
        <Svg width="100%" height="92" viewBox={`0 0 ${width} 92`}>
          {[24, 56].map((y) => (
            <Line
              key={y}
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              stroke={colors.border}
              strokeWidth="1"
            />
          ))}
          {values.length > 1 ? (
            <Polyline
              points={points}
              fill="none"
              stroke={colors.foreground}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {values.map((value, index) => {
            const x = horizontalPadding + index * step;
            const y =
              height -
              verticalPadding -
              (value / max) * (height - verticalPadding * 2);
            return (
              <Circle
                key={`${value}-${index}`}
                cx={x}
                cy={y}
                r={index === values.length - 1 ? 4.5 : 3.5}
                fill={colors.foreground}
              />
            );
          })}
        </Svg>
      </View>
      <Text className="mt-3 text-xs text-muted">
        {t(
          "Volumen der letzten sieben Trainings",
          "Volume across your last seven workouts",
        )}
      </Text>
    </Animated.View>
  );
}

function HistoryMetric({
  label,
  value,
  colors,
  accent = false,
}: {
  label: string;
  value: string;
  colors: any;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 62,
        justifyContent: "center",
        borderRadius: ZAYMAX_DESIGN.radius.nested,
        borderWidth: 1,
        borderColor: accent ? ZAYMAX_DESIGN.colors.goldLine : colors.border,
        backgroundColor: accent
          ? ZAYMAX_DESIGN.colors.goldSoft
          : ZAYMAX_DESIGN.colors.surfaceSoft,
        paddingHorizontal: 10,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ color: colors.muted, fontSize: 9, fontWeight: "800" }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          marginTop: 6,
          color: accent ? PROGRESS_GOLD : colors.foreground,
          fontSize: 18,
          fontWeight: "900",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function HistoryCard({
  entry,
  index,
  unit,
  locale,
  colors,
  onOpenExercise,
}: {
  entry: WorkoutHistoryEntry;
  index: number;
  unit: WeightUnit;
  locale: string;
  colors: any;
  onOpenExercise: (exerciseId: string, name: string) => void;
}) {
  const { language, t } = useLanguage();
  const totalSets = entry.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 35, 140)).duration(
        ZAYMAX_DESIGN.motion.standard,
      )}
      className="mb-4 bg-surface"
      style={{
        position: "relative",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: ZAYMAX_DESIGN.radius.card,
        backgroundColor: "transparent",
        padding: 16,
      }}
    >
      <GlassMaterial intensity={24} />
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-black text-foreground">
            {entry.workoutTitle}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            {formatDateTime(entry.completedAt, locale)}
          </Text>
          {entry.effort ? (
            <Text className="mt-2 text-xs font-black uppercase tracking-[1.5px] text-foreground">
              {t("Gefühl", "Feeling")} · {effortLabel(entry.effort, language)}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            borderRadius: ZAYMAX_DESIGN.radius.round,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text className="text-xs font-bold text-foreground">
            {totalSets}{" "}
            {totalSets === 1 ? t("Satz", "set") : t("Sätze", "sets")}
          </Text>
        </View>
      </View>
      {entry.durationSeconds ||
      entry.totalVolumeKg ||
      entry.improvementCount ||
      entry.personalBestCount ? (
        <Text className="mt-3 text-xs font-semibold text-muted">
          {entry.durationSeconds
            ? formatWorkoutDuration(entry.durationSeconds, language)
            : "—"}{" "}
          ·{" "}
          {entry.totalVolumeKg
            ? displayWeight(entry.totalVolumeKg, unit)
            : `0 ${unit}`}{" "}
          {t("Volumen", "volume")} · {entry.improvementCount ?? 0}{" "}
          {t("gesteigert", "improved")} · {entry.personalBestCount ?? 0} PR
        </Text>
      ) : null}

      {entry.exercises.length ? (
        entry.exercises.map((exercise) => (
          <View
            key={exercise.exerciseId}
            className="mt-5 border-t border-border pt-4"
          >
            {exercise.skipped ? (
              <View>
                <Text className="font-bold text-foreground">
                  {exercise.name}
                </Text>
                <Text className="mt-1 text-xs font-black uppercase tracking-[1.4px] text-muted">
                  {t("Übersprungen", "Skipped", "Pominięto")}
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityLabel={t(
                  `Fortschritt für ${exercise.name} öffnen`,
                  `Open progress for ${exercise.name}`,
                  `Otwórz postęp dla ćwiczenia ${exercise.name}`,
                )}
                onPress={() => {
                  hapticTap();
                  onOpenExercise(exercise.exerciseId, exercise.name);
                }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.55 : 1,
                  },
                ]}
              >
                <View>
                  <Text className="font-bold text-foreground">
                    {exercise.name}
                  </Text>
                  <Text className="mt-1 text-xs text-muted">
                    {t(
                      "Übungsfortschritt ansehen",
                      "View exercise progress",
                      "Zobacz postęp ćwiczenia",
                    )}
                  </Text>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={19}
                  color={colors.muted}
                />
              </Pressable>
            )}
            {exercise.skipped ? (
              <View
                style={{
                  marginTop: 12,
                  borderRadius: ZAYMAX_DESIGN.radius.nested,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                  padding: 13,
                }}
              >
                <Text className="text-center text-sm font-bold text-muted">
                  {t("Übersprungen", "Skipped", "Pominięto")}
                </Text>
              </View>
            ) : (
              <View className="mt-3 gap-2">
                {exercise.sets.map((set) => (
                  <View
                    key={`${exercise.exerciseId}-${set.setNumber}`}
                    className="flex-row items-start justify-between border border-border px-3 py-3"
                    style={{
                      borderRadius: ZAYMAX_DESIGN.radius.nested,
                      backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                    }}
                  >
                    <Text className="text-sm font-semibold text-muted">
                      {t("Satz", "Set")} {set.setNumber}
                    </Text>
                    <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
                      <Text className="text-right text-sm font-bold text-foreground">
                        {set.reps} {t("Wdh.", "reps")} ·{" "}
                        {set.weightKg
                          ? displayWeight(set.weightKg, unit)
                          : t("ohne Gewicht", "no weight")}
                      </Text>
                      {set.repsGain ||
                      set.weightGainKg ||
                      set.repsPersonalBest ||
                      set.weightPersonalBest ? (
                        <View
                          style={{
                            marginTop: 7,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 9,
                          }}
                        >
                          {set.repsGain ? (
                            <HistoryProgressMark
                              icon="medal.fill"
                              value={`+${set.repsGain}`}
                            />
                          ) : null}
                          {set.weightGainKg ? (
                            <HistoryProgressMark
                              icon="dumbbell.fill"
                              value={`+${displayWeight(set.weightGainKg, unit)}`}
                            />
                          ) : null}
                          {set.repsPersonalBest || set.weightPersonalBest ? (
                            <Text
                              style={{
                                color: PROGRESS_GOLD,
                                fontSize: 11,
                                fontWeight: "900",
                              }}
                            >
                              PR
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      ) : (
        <Text className="mt-5 border-t border-border pt-4 text-sm text-muted">
          {t(
            "Bei diesem Training wurde kein Satz abgehakt.",
            "No set was completed in this workout.",
          )}
        </Text>
      )}
    </Animated.View>
  );
}

function effortLabel(effort: "leicht" | "gut" | "hart", language: AppLanguage) {
  if (language === "de") {
    return { leicht: "Leicht", gut: "Gut", hart: "Hart" }[effort];
  }
  if (language === "pl") {
    return { leicht: "Lekko", gut: "Dobrze", hart: "Ciężko" }[effort];
  }
  return { leicht: "Easy", gut: "Good", hart: "Hard" }[effort];
}

function HistoryProgressMark({
  icon,
  value,
}: {
  icon: "medal.fill" | "dumbbell.fill";
  value: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <IconSymbol name={icon} size={15} color={PROGRESS_GOLD} />
      <Text
        style={{
          marginLeft: 4,
          color: PROGRESS_GOLD,
          fontSize: 12,
          fontWeight: "800",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
