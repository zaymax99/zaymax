import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  displayWeight,
  formatDateTime,
  loadSettings,
  loadWorkoutHistory,
  type WeightUnit,
  type WorkoutEffort,
  type WorkoutHistoryExercise,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";

const GOLD = "#C6A752";

type ExerciseSession = {
  id: string;
  completedAt: string;
  effort?: WorkoutEffort;
  durationSeconds?: number;
  exercise: WorkoutHistoryExercise;
  volumeKg: number;
  maxWeightKg: number;
  maxReps: number;
};

export default function ExerciseHistoryScreen() {
  const colors = useColors("dark");
  const { language, locale, t } = useLanguage();
  const router = useRouter();
  const { exerciseId, name } = useLocalSearchParams<{
    exerciseId: string;
    name: string;
  }>();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  const refresh = useCallback(async () => {
    const [history, settings] = await Promise.all([
      loadWorkoutHistory(),
      loadSettings(),
    ]);
    const normalizedName = (name ?? "").trim().toLocaleLowerCase("de-DE");
    const entries = history.flatMap((entry) =>
      entry.exercises
        .filter(
          (exercise) =>
            exercise.exerciseId === exerciseId ||
            exercise.name.trim().toLocaleLowerCase("de-DE") === normalizedName,
        )
        .map((exercise) => ({
          id: `${entry.id}-${exercise.exerciseId}`,
          completedAt: entry.completedAt,
          effort: entry.effort,
          durationSeconds: entry.durationSeconds,
          exercise,
          volumeKg: exercise.sets.reduce(
            (sum, set) => sum + set.reps * (set.weightKg ?? 0),
            0,
          ),
          maxWeightKg: Math.max(
            0,
            ...exercise.sets.map((set) => set.weightKg ?? 0),
          ),
          maxReps: Math.max(0, ...exercise.sets.map((set) => set.reps)),
        })),
    );
    setSessions(entries);
    setWeightUnit(settings.weightUnit);
  }, [exerciseId, name]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const stats = useMemo(
    () => ({
      bestWeightKg: Math.max(
        0,
        ...sessions.map((session) => session.maxWeightKg),
      ),
      bestReps: Math.max(0, ...sessions.map((session) => session.maxReps)),
      totalVolumeKg: sessions.reduce(
        (sum, session) => sum + session.volumeKg,
        0,
      ),
    }),
    [sessions],
  );

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 38 }}
      >
        <View className="flex-row items-center pt-3 pb-7">
          <ZaymaxWatermark />
          <Pressable
            accessibilityLabel={t("Zurück", "Back")}
            onPress={() => router.back()}
            style={({ pressed }) => [
              { padding: 8, marginRight: 6, opacity: pressed ? 0.55 : 1 },
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
              {t("ÜBUNGSFORTSCHRITT", "EXERCISE PROGRESS")}
            </Text>
            <Text className="mt-1 text-3xl font-black uppercase text-foreground">
              {name}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <StatCard
            label={t("Bestes Gewicht", "Best weight")}
            value={
              stats.bestWeightKg
                ? displayWeight(stats.bestWeightKg, weightUnit)
                : "—"
            }
            colors={colors}
          />
          <StatCard
            label={t("Beste Wiederholungen", "Best repetitions")}
            value={stats.bestReps ? String(stats.bestReps) : "—"}
            colors={colors}
          />
          <StatCard
            label={t("Einheiten", "Sessions")}
            value={String(sessions.length)}
            colors={colors}
          />
          <StatCard
            label={t("Gesamtvolumen", "Total volume")}
            value={
              stats.totalVolumeKg
                ? displayWeight(stats.totalVolumeKg, weightUnit)
                : `0 ${weightUnit}`
            }
            colors={colors}
          />
        </View>

        <View
          className="mt-4 bg-surface/80 p-5"
          style={{ borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
            {t("ENTWICKLUNG", "DEVELOPMENT")}
          </Text>
          <Text className="mt-2 text-xl font-black uppercase text-foreground">
            {sessions.some((session) => session.volumeKg > 0)
              ? t("Trainingsvolumen", "Training volume")
              : t("Wiederholungen", "Repetitions")}
          </Text>
          <ProgressChart sessions={sessions} colors={colors} />
          <Text className="mt-2 text-xs text-muted">
            {t(
              `Die letzten ${Math.min(8, sessions.length)} Einheiten · älteste bis neueste`,
              `Last ${Math.min(8, sessions.length)} sessions · oldest to newest`,
            )}
          </Text>
        </View>

        <Text className="mt-8 text-xl font-black uppercase text-foreground">
          {t("Letzte Einheiten", "Recent sessions")}
        </Text>
        {sessions.length ? (
          sessions.map((session) => (
            <View
              key={session.id}
              className="mt-3 bg-surface/80 p-4"
              style={{ borderWidth: 1, borderColor: colors.border }}
            >
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="font-bold text-foreground">
                    {formatDateTime(session.completedAt, locale)}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-muted">
                    {session.effort
                      ? `${t("Gefühl", "Feeling")} · ${effortLabel(session.effort, language)}`
                      : t("Gefühl nicht erfasst", "Feeling not recorded")}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-foreground">
                  {session.exercise.sets.length}{" "}
                  {session.exercise.sets.length === 1
                    ? t("Satz", "set")
                    : t("Sätze", "sets")}
                </Text>
              </View>
              <View className="mt-3 gap-2">
                {session.exercise.sets.map((set) => (
                  <View
                    key={set.setNumber}
                    className="flex-row items-center justify-between border-t border-border pt-2"
                  >
                    <Text className="text-sm text-muted">
                      {t("Satz", "Set")} {set.setNumber}
                    </Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text className="text-sm font-bold text-foreground">
                        {set.reps} {t("Wdh.", "reps")} ·{" "}
                        {set.weightKg
                          ? displayWeight(set.weightKg, weightUnit)
                          : t("ohne Gewicht", "no weight")}
                      </Text>
                      {set.repsPersonalBest || set.weightPersonalBest ? (
                        <Text
                          style={{
                            marginTop: 3,
                            color: GOLD,
                            fontSize: 10,
                            fontWeight: "900",
                          }}
                        >
                          {t("PERSÖNLICHE BESTLEISTUNG", "PERSONAL BEST")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View className="mt-3 rounded-md border border-border bg-surface/40 p-6">
            <Text className="font-black uppercase text-foreground">
              {t("Noch keine Daten", "No data yet")}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              {t(
                "Schließe ein Training mit dieser Übung ab, um ihre Entwicklung zu sehen.",
                "Finish a workout with this exercise to see its development.",
              )}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={{
        width: "48.5%",
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: `${colors.surface}E8`,
        padding: 14,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 1,
          color: colors.muted,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          marginTop: 7,
          fontSize: 18,
          fontWeight: "800",
          color: colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ProgressChart({
  sessions,
  colors,
}: {
  sessions: ExerciseSession[];
  colors: any;
}) {
  const recent = sessions.slice(0, 8).reverse();
  const useVolume = recent.some((session) => session.volumeKg > 0);
  const values = recent.map((session) =>
    useVolume
      ? session.volumeKg
      : session.exercise.sets.reduce((sum, set) => sum + set.reps, 0),
  );
  const max = Math.max(1, ...values);
  const width = 320;
  const height = 118;
  const horizontalPadding = 12;
  const verticalPadding = 16;
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
    <View style={{ marginTop: 14, height: 126, overflow: "hidden" }}>
      <Svg width="100%" height="126" viewBox={`0 0 ${width} 126`}>
        {[24, 59, 94].map((y) => (
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
              r="4"
              fill={index === values.length - 1 ? GOLD : colors.foreground}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function effortLabel(effort: WorkoutEffort, language: "de" | "en") {
  const labels =
    language === "de"
      ? { leicht: "Leicht", gut: "Gut", hart: "Hart" }
      : { leicht: "Easy", gut: "Good", hart: "Hard" };
  return labels[effort];
}
