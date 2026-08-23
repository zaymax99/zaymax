import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  displayWeight,
  formatDateTime,
  loadSettings,
  loadWorkoutHistory,
  type WeightUnit,
  type WorkoutHistoryEntry,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";

const GOLD = "#C6A752";

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
      void refresh();
    }, [refresh]),
  );

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="flex-row items-center pt-3 pb-7">
            <ZaymaxWatermark />
            <Pressable
              accessibilityLabel={t("Zurück", "Back")}
              onPress={() => router.back()}
              style={({ pressed }) => [
                {
                  padding: 8,
                  marginRight: 6,
                  borderRadius: 999,
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
              <Text className="mt-1 text-3xl font-black uppercase text-foreground">
                {t("Historie", "History")}
              </Text>
              <Text className="mt-2 text-base text-muted">
                {t(
                  "Deine zuletzt abgeschlossenen Sätze.",
                  "Your recently completed sets.",
                )}
              </Text>
            </View>
            <IconSymbol
              name="book.closed.fill"
              size={24}
              color={colors.foreground}
            />
          </View>
        }
        ListEmptyComponent={
          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-1 items-center justify-center bg-surface/80 p-7"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
            }}
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-background">
              <IconSymbol
                name="book.closed.fill"
                size={26}
                color={colors.foreground}
              />
            </View>
            <Text className="mt-4 text-center text-lg font-black uppercase text-foreground">
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
      entering={FadeInDown.delay(index * 60).duration(300)}
      className="mb-4 bg-surface/80 p-5"
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 24,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-black uppercase text-foreground">
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
        <View className="rounded-full border border-border bg-background px-3 py-2">
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
            ? formatHistoryDuration(entry.durationSeconds, language)
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
            <Pressable
              accessibilityLabel={t(
                `Fortschritt für ${exercise.name} öffnen`,
                `Open progress for ${exercise.name}`,
              )}
              onPress={() => onOpenExercise(exercise.exerciseId, exercise.name)}
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
                  {t("Übungsfortschritt ansehen", "View exercise progress")}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={19} color={colors.muted} />
            </Pressable>
            <View className="mt-3 gap-2">
              {exercise.sets.map((set) => (
                <View
                  key={`${exercise.exerciseId}-${set.setNumber}`}
                  className="flex-row items-start justify-between rounded-2xl border border-border bg-background px-3 py-3"
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
                    {set.repsGain || set.weightGainKg ? (
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
                              color: GOLD,
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

function formatHistoryDuration(seconds: number, language: "de" | "en") {
  const minutes = Math.floor(seconds / 60);
  return minutes
    ? `${minutes} min`
    : `${seconds} ${language === "de" ? "Sek." : "sec"}`;
}

function effortLabel(effort: "leicht" | "gut" | "hart", language: "de" | "en") {
  const labels =
    language === "de"
      ? { leicht: "Leicht", gut: "Gut", hart: "Hart" }
      : { leicht: "Easy", gut: "Good", hart: "Hard" };
  return labels[effort];
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
      <IconSymbol name={icon} size={15} color={GOLD} />
      <Text
        style={{ marginLeft: 4, color: GOLD, fontSize: 12, fontWeight: "800" }}
      >
        {value}
      </Text>
    </View>
  );
}
