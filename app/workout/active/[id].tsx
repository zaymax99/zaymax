import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import {
  completedValuesForTemplate,
  displayWeight,
  finalizeWorkoutStorage,
  gainsForSet,
  loadActiveSession,
  loadSettings,
  loadWorkoutHistory,
  loadWorkouts,
  saveActiveSession,
  setValuesForExercise,
  toKg,
  uid,
  type ActiveSession,
  type ActiveSetValue,
  type SetGains,
  type WeightUnit,
  type Workout,
  type WorkoutEffort,
  type WorkoutHistoryEntry,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";
import {
  hapticAction,
  hapticSelection,
  hapticSuccess,
  hapticTap,
  hapticWarning,
} from "@/lib/haptics";
import { useLanguage, usesDecimalComma } from "@/lib/i18n";
import {
  calculateWorkoutDurationSeconds,
  formatWorkoutDuration,
  normalizeWorkoutStartedAt,
} from "@/lib/workout-duration";

const DEFAULT_REST = 90;
const GOLD = ZAYMAX_DESIGN.colors.gold;
const EFFORT_OPTIONS: {
  value: WorkoutEffort;
  deLabel: string;
  enLabel: string;
  plLabel: string;
  deDetail: string;
  enDetail: string;
  plDetail: string;
}[] = [
  {
    value: "leicht",
    deLabel: "Leicht",
    enLabel: "Easy",
    plLabel: "Lekko",
    deDetail: "Noch viel Luft",
    enDetail: "Plenty left",
    plDetail: "Duży zapas",
  },
  {
    value: "gut",
    deLabel: "Gut",
    enLabel: "Good",
    plLabel: "Dobrze",
    deDetail: "Genau richtig",
    enDetail: "Just right",
    plDetail: "W sam raz",
  },
  {
    value: "hart",
    deLabel: "Hart",
    enLabel: "Hard",
    plLabel: "Ciężko",
    deDetail: "Am Limit",
    enDetail: "At the limit",
    plDetail: "Na granicy",
  },
];

type Improvement = SetGains & {
  exerciseId: string;
  setIndex: number;
  sequence: number;
};
type CompletionSummary = {
  durationSeconds: number;
  completedSets: number;
  totalVolumeKg: number;
  improvementCount: number;
  personalBestCount: number;
  effort: WorkoutEffort;
};

function displayWeightGain(weightGainKg: number, unit: WeightUnit) {
  const value = unit === "lbs" ? weightGainKg * 2.20462 : weightGainKg;
  return Number(value.toFixed(1));
}

export default function ActiveWorkoutScreen() {
  const colors = useColors("dark");
  const { language, t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loadIssue, setLoadIssue] = useState<"missing" | "failed" | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [effortPromptVisible, setEffortPromptVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const [completionSummary, setCompletionSummary] =
    useState<CompletionSummary | null>(null);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const improvementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const improvementSequence = useRef(0);
  const saveWarningShown = useRef(false);
  const goldFlash = useSharedValue(0);
  const goldStyle = useAnimatedStyle(() => ({ opacity: goldFlash.value }));
  const progressFill = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressFill.value}%` as `${number}%`,
  }));

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [allWorkouts, existing, settings, history] = await Promise.all([
          loadWorkouts(),
          loadActiveSession(),
          loadSettings(),
          loadWorkoutHistory(),
        ]);
        const found = allWorkouts.find((item) => item.id === id);
        if (!found) {
          if (mounted) setLoadIssue("missing");
          return;
        }
        const canResume = existing?.workoutId === id;
        const openedAt = new Date().toISOString();
        const previousWorkout = history.find((entry) => entry.workoutId === id);
        const initial: ActiveSession = {
          workoutId: id!,
          startedAt: canResume
            ? normalizeWorkoutStartedAt(existing.startedAt, openedAt)
            : openedAt,
          completedSets: {},
          setValues: {},
          baselineSetValues: {},
          restSeconds: settings.restSeconds || DEFAULT_REST,
          restRemaining: canResume ? (existing.restRemaining ?? 0) : 0,
        };

        found.exercises.forEach((exercise) => {
          const templateValues = setValuesForExercise(exercise);
          const resumedValues = canResume
            ? existing.setValues?.[exercise.id]
            : undefined;
          const valueCount =
            canResume && resumedValues?.length
              ? Math.min(
                  20,
                  Math.max(resumedValues.length, templateValues.length),
                )
              : templateValues.length;
          const values = Array.from({ length: valueCount }, (_, setIndex) => ({
            ...(resumedValues?.[setIndex] ??
              templateValues[setIndex] ??
              resumedValues?.at(-1) ?? { reps: 10, weightKg: null }),
          }));
          const resumedBaseline = canResume
            ? existing.baselineSetValues?.[exercise.id]
            : undefined;
          const previousExercise = previousWorkout?.exercises.find(
            (item) =>
              item.exerciseId === exercise.id ||
              item.name.trim().toLocaleLowerCase("de-DE") ===
                exercise.name.trim().toLocaleLowerCase("de-DE"),
          );
          const baseline = values.map((value, setIndex) => {
            const historicalSet = previousExercise?.sets.find(
              (set) => set.setNumber === setIndex + 1,
            );
            const historicalValue = historicalSet
              ? {
                  reps: historicalSet.reps,
                  weightKg: historicalSet.weightKg ?? null,
                }
              : undefined;
            return {
              ...((canResume ? resumedBaseline?.[setIndex] : historicalValue) ??
                templateValues[setIndex] ??
                value),
            };
          });
          const savedChecks = canResume
            ? (existing.completedSets?.[exercise.id] ?? [])
            : [];
          initial.setValues[exercise.id] = values;
          initial.baselineSetValues[exercise.id] = baseline;
          initial.completedSets[exercise.id] = values.map(
            (_, setIndex) => savedChecks[setIndex] ?? false,
          );
        });

        await saveActiveSession(initial);
        if (!mounted) return;
        setWorkout(found);
        setWeightUnit(settings.weightUnit);
        setSession(initial);
      } catch {
        if (mounted) setLoadIssue("failed");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(
    () => () => {
      if (improvementTimer.current) clearTimeout(improvementTimer.current);
    },
    [],
  );

  const restRemaining = session?.restRemaining ?? 0;
  useEffect(() => {
    if (timerRunning && restRemaining === 0) {
      setTimerRunning(false);
      hapticWarning();
      return;
    }
    if (!timerRunning || !restRemaining) return;
    const interval = setInterval(() => {
      setSession((current) =>
        current
          ? {
              ...current,
              restRemaining: Math.max(0, current.restRemaining - 1),
            }
          : current,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, restRemaining]);

  useEffect(() => {
    if (!session) return;
    void saveActiveSession(session).catch(() => {
      if (saveWarningShown.current) return;
      saveWarningShown.current = true;
      Alert.alert(
        t(
          "Training konnte nicht zwischengespeichert werden",
          "Workout could not be saved temporarily",
          "Nie udało się tymczasowo zapisać treningu",
        ),
        t(
          "Lasse das Training geöffnet und versuche es gleich erneut.",
          "Keep the workout open and try again shortly.",
          "Pozostaw trening otwarty i spróbuj ponownie za chwilę.",
        ),
      );
    });
  }, [session, t]);

  const completedCount = useMemo(
    () =>
      session
        ? Object.values(session.completedSets).flat().filter(Boolean).length
        : 0,
    [session],
  );
  const totalSets = useMemo(
    () =>
      session
        ? Object.values(session.setValues).reduce(
            (sum, values) => sum + values.length,
            0,
          )
        : 0,
    [session],
  );
  const progress = Math.min(
    100,
    (completedCount / Math.max(1, totalSets)) * 100,
  );
  const timerText = session
    ? `${String(Math.floor(session.restRemaining / 60)).padStart(2, "0")}:${String(session.restRemaining % 60).padStart(2, "0")}`
    : "01:30";

  useEffect(() => {
    progressFill.value = withTiming(progress, {
      duration: ZAYMAX_DESIGN.motion.standard,
    });
  }, [progress, progressFill]);

  function updateSetValue(
    exerciseId: string,
    setIndex: number,
    patch: Partial<ActiveSetValue>,
  ) {
    setSession((current) => {
      if (!current) return current;
      const values = [...(current.setValues[exerciseId] ?? [])];
      values[setIndex] = { ...values[setIndex], ...patch };
      return {
        ...current,
        setValues: { ...current.setValues, [exerciseId]: values },
      };
    });
  }

  function announceImprovement(
    exerciseId: string,
    setIndex: number,
    value: ActiveSetValue,
  ) {
    const baseline =
      session?.baselineSetValues[exerciseId]?.[setIndex] ?? value;
    const gains = gainsForSet(value, baseline);
    if (!gains.repsGain && !gains.weightGainKg) return;
    improvementSequence.current += 1;
    setImprovement({
      exerciseId,
      setIndex,
      ...gains,
      sequence: improvementSequence.current,
    });
    goldFlash.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(520, withTiming(0, { duration: 420 })),
    );
    if (improvementTimer.current) clearTimeout(improvementTimer.current);
    improvementTimer.current = setTimeout(() => setImprovement(null), 1400);
    hapticSuccess();
  }

  function changeReps(exerciseId: string, setIndex: number, reps: number) {
    const safeReps = Math.max(0, Math.min(999, Math.round(reps)));
    const currentValue = session?.setValues[exerciseId]?.[setIndex] ?? {
      reps: 0,
      weightKg: null,
    };
    const previous = currentValue.reps;
    const baseline =
      session?.baselineSetValues[exerciseId]?.[setIndex]?.reps ?? previous;
    updateSetValue(exerciseId, setIndex, { reps: safeReps });
    const gain = safeReps - baseline;
    if (safeReps > previous && gain > 0)
      announceImprovement(exerciseId, setIndex, {
        ...currentValue,
        reps: safeReps,
      });
  }

  function changeWeight(
    exerciseId: string,
    setIndex: number,
    displayValue: number,
  ) {
    const safeValue = Math.max(0, Math.min(5000, displayValue));
    const nextWeightKg = safeValue > 0 ? toKg(safeValue, weightUnit) : null;
    const currentValue = session?.setValues[exerciseId]?.[setIndex] ?? {
      reps: 0,
      weightKg: null,
    };
    const previousWeightKg = currentValue.weightKg ?? 0;
    const baselineWeightKg =
      session?.baselineSetValues[exerciseId]?.[setIndex]?.weightKg ?? 0;
    updateSetValue(exerciseId, setIndex, { weightKg: nextWeightKg });
    if (
      (nextWeightKg ?? 0) > previousWeightKg &&
      (nextWeightKg ?? 0) > baselineWeightKg
    ) {
      announceImprovement(exerciseId, setIndex, {
        ...currentValue,
        weightKg: nextWeightKg,
      });
    }
  }

  function addSet(exerciseId: string) {
    setSession((current) => {
      if (!current) return current;
      const values = [...(current.setValues[exerciseId] ?? [])];
      if (values.length >= 20) return current;
      const nextValue = { ...(values.at(-1) ?? { reps: 10, weightKg: null }) };
      return {
        ...current,
        setValues: {
          ...current.setValues,
          [exerciseId]: [...values, nextValue],
        },
        baselineSetValues: {
          ...current.baselineSetValues,
          [exerciseId]: [
            ...(current.baselineSetValues[exerciseId] ?? []),
            { ...nextValue },
          ],
        },
        completedSets: {
          ...current.completedSets,
          [exerciseId]: [...(current.completedSets[exerciseId] ?? []), false],
        },
      };
    });
    hapticTap();
  }

  function removeSet(exerciseId: string) {
    setSession((current) => {
      if (!current || (current.setValues[exerciseId]?.length ?? 0) <= 1)
        return current;
      return {
        ...current,
        setValues: {
          ...current.setValues,
          [exerciseId]: current.setValues[exerciseId].slice(0, -1),
        },
        baselineSetValues: {
          ...current.baselineSetValues,
          [exerciseId]: (current.baselineSetValues[exerciseId] ?? []).slice(
            0,
            -1,
          ),
        },
        completedSets: {
          ...current.completedSets,
          [exerciseId]: (current.completedSets[exerciseId] ?? []).slice(0, -1),
        },
      };
    });
    hapticTap();
  }

  function toggleSet(exerciseId: string, setIndex: number) {
    hapticTap();
    const willBeChecked = !(
      session?.completedSets[exerciseId]?.[setIndex] ?? false
    );
    if (willBeChecked) setTimerRunning(true);
    setSession((current) => {
      if (!current) return current;
      const checks = [...(current.completedSets[exerciseId] ?? [])];
      checks[setIndex] = !checks[setIndex];
      return {
        ...current,
        completedSets: { ...current.completedSets, [exerciseId]: checks },
        restRemaining: checks[setIndex]
          ? current.restSeconds
          : current.restRemaining,
      };
    });
  }

  function startRest() {
    hapticTap();
    setSession((current) =>
      current ? { ...current, restRemaining: current.restSeconds } : current,
    );
    setTimerRunning(true);
  }

  function resetRest() {
    hapticSelection();
    setTimerRunning(false);
    setSession((current) =>
      current ? { ...current, restRemaining: 0 } : current,
    );
  }

  function finish() {
    if (!workout || !session) return;
    hapticAction();
    if (completedCount < totalSets) {
      const missing = totalSets - completedCount;
      Alert.alert(
        t("Workout noch nicht fertig", "Workout is not finished yet"),
        t(
          `Hake noch ${missing} ${missing === 1 ? "Satz" : "Sätze"} ab oder beende das Workout trotzdem.`,
          `Complete ${missing} more ${missing === 1 ? "set" : "sets"}, or finish the workout anyway.`,
          `Oznacz jeszcze ${missing} ${missing === 1 ? "serię" : "serie"} lub zakończ trening mimo to.`,
        ),
        [
          { text: t("Weiter trainieren", "Keep training"), style: "cancel" },
          {
            text: t("Trotzdem beenden", "Finish anyway"),
            onPress: () => setEffortPromptVisible(true),
          },
        ],
      );
      return;
    }
    setEffortPromptVisible(true);
  }

  async function completeWorkout(effort: WorkoutEffort) {
    if (!workout || !session || finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    try {
      const completedAt = new Date().toISOString();
      const [all, history] = await Promise.all([
        loadWorkouts(),
        loadWorkoutHistory(),
      ]);
      const historyExercises = workout.exercises
        .map((exercise) => {
          const values = session.setValues[exercise.id] ?? [];
          const previousSets = history.flatMap((entry) =>
            entry.exercises
              .filter(
                (item) =>
                  item.exerciseId === exercise.id ||
                  item.name.trim().toLocaleLowerCase("de-DE") ===
                    exercise.name.trim().toLocaleLowerCase("de-DE"),
              )
              .flatMap((item) => item.sets),
          );
          const bestReps = Math.max(0, ...previousSets.map((set) => set.reps));
          const bestWeightKg = Math.max(
            0,
            ...previousSets.map((set) => set.weightKg ?? 0),
          );
          const completedIndexes = values
            .map((_, setIndex) => setIndex)
            .filter(
              (setIndex) => session.completedSets[exercise.id]?.[setIndex],
            );
          const currentBestReps = Math.max(
            0,
            ...completedIndexes.map((setIndex) => values[setIndex].reps),
          );
          const currentBestWeightKg = Math.max(
            0,
            ...completedIndexes.map(
              (setIndex) => values[setIndex].weightKg ?? 0,
            ),
          );
          const repsBestIndex = completedIndexes.find(
            (setIndex) => values[setIndex].reps === currentBestReps,
          );
          const weightBestIndex = completedIndexes.find(
            (setIndex) =>
              (values[setIndex].weightKg ?? 0) === currentBestWeightKg,
          );
          return {
            exerciseId: exercise.id,
            name: exercise.name,
            sets: values.flatMap((value, setIndex) => {
              if (!session.completedSets[exercise.id]?.[setIndex]) return [];
              const baseline =
                session.baselineSetValues[exercise.id]?.[setIndex] ?? value;
              const gains = gainsForSet(value, baseline);
              return [
                {
                  setNumber: setIndex + 1,
                  reps: value.reps,
                  weightKg: value.weightKg ?? undefined,
                  repsGain: gains.repsGain || undefined,
                  weightGainKg: gains.weightGainKg || undefined,
                  repsPersonalBest:
                    setIndex === repsBestIndex && currentBestReps > bestReps,
                  weightPersonalBest:
                    setIndex === weightBestIndex &&
                    currentBestWeightKg > bestWeightKg,
                },
              ];
            }),
          };
        })
        .filter((exercise) => exercise.sets.length > 0);
      const completedHistorySets = historyExercises.flatMap(
        (exercise) => exercise.sets,
      );
      const durationSeconds = calculateWorkoutDurationSeconds(
        session.startedAt,
        completedAt,
      );
      const totalVolumeKg = completedHistorySets.reduce(
        (sum, set) => sum + set.reps * (set.weightKg ?? 0),
        0,
      );
      const improvementCount = completedHistorySets.filter(
        (set) => set.repsGain || set.weightGainKg,
      ).length;
      const personalBestCount = completedHistorySets.reduce(
        (sum, set) =>
          sum +
          Number(Boolean(set.repsPersonalBest)) +
          Number(Boolean(set.weightPersonalBest)),
        0,
      );
      const historyEntry: WorkoutHistoryEntry = {
        id: uid(),
        workoutId: workout.id,
        workoutTitle: workout.title,
        startedAt: session.startedAt,
        completedAt,
        durationSeconds,
        totalVolumeKg,
        completedSetCount: completedHistorySets.length,
        improvementCount,
        personalBestCount,
        effort,
        exercises: historyExercises,
      };
      const updatedWorkouts = all.map((item) => {
        if (item.id !== workout.id) return item;
        return {
          ...item,
          completedAt,
          updatedAt: completedAt,
          exercises: item.exercises.map((exercise) => {
            const values =
              session.setValues[exercise.id] ?? setValuesForExercise(exercise);
            const completedValues = completedValuesForTemplate(
              exercise,
              values,
              session.completedSets[exercise.id] ?? [],
            );
            return {
              ...exercise,
              sets: completedValues.length,
              reps: completedValues[0]?.reps ?? exercise.reps,
              repsPerSet: completedValues.map((value) => value.reps),
              weightKg: completedValues[0]?.weightKg ?? undefined,
              weightsPerSetKg: completedValues.map((value) => value.weightKg),
            };
          }),
        };
      });
      await finalizeWorkoutStorage(updatedWorkouts, [historyEntry, ...history]);
      setEffortPromptVisible(false);
      setCompletionSummary({
        durationSeconds,
        completedSets: completedHistorySets.length,
        totalVolumeKg,
        improvementCount,
        personalBestCount,
        effort,
      });
      hapticSuccess();
    } catch {
      Alert.alert(
        t(
          "Training konnte nicht abgeschlossen werden",
          "Workout could not be completed",
          "Nie udało się zakończyć treningu",
        ),
        t(
          "Dein Training bleibt geöffnet. Bitte versuche das Speichern erneut.",
          "Your workout will remain open. Please try saving it again.",
          "Trening pozostanie otwarty. Spróbuj zapisać go ponownie.",
        ),
      );
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  }

  if (loadIssue) {
    return (
      <ScreenContainer className="items-center justify-center px-7">
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={32}
          color={colors.muted}
        />
        <Text className="mt-4 text-center text-2xl font-black text-foreground">
          {loadIssue === "missing"
            ? t(
                "Workout nicht gefunden",
                "Workout not found",
                "Nie znaleziono treningu",
              )
            : t(
                "Training konnte nicht geladen werden",
                "Workout could not be loaded",
                "Nie udało się wczytać treningu",
              )}
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">
          {t(
            "Kehre zur Startseite zurück und öffne das Workout erneut.",
            "Return to the home screen and open the workout again.",
            "Wróć do ekranu głównego i ponownie otwórz trening.",
          )}
        </Text>
        <Pressable
          onPress={() => {
            hapticTap();
            router.replace("/");
          }}
          style={({ pressed }) => ({
            marginTop: 20,
            minWidth: 190,
            alignItems: "center",
            borderRadius: ZAYMAX_DESIGN.radius.round,
            backgroundColor: colors.primary,
            paddingVertical: 14,
            paddingHorizontal: 20,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text className="font-black text-background">
            {t("Zur Startseite", "Go to home", "Wróć do strony głównej")}
          </Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (!workout || !session) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">
          {t("Training wird geladen …", "Loading workout …")}
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 38 }}
      >
        <View className="flex-row items-center pt-3 pb-6">
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
                marginRight: 8,
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
              {t("AKTIVES TRAINING", "ACTIVE WORKOUT")}
            </Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">
              {workout.title}
            </Text>
          </View>
        </View>

        <View
          className="bg-surface p-[18px]"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: ZAYMAX_DESIGN.radius.card,
            ...ZAYMAX_DESIGN.shadow,
          }}
        >
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                {t("FORTSCHRITT", "PROGRESS")}
              </Text>
              <Text className="mt-2 text-4xl font-black text-foreground">
                {completedCount}
                <Text className="text-base font-medium text-muted">
                  {" "}
                  / {totalSets}
                </Text>
              </Text>
            </View>
            {improvement ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  borderWidth: 1,
                  borderColor: GOLD,
                  backgroundColor: ZAYMAX_DESIGN.colors.goldSoft,
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  paddingHorizontal: 9,
                  paddingVertical: 6,
                }}
              >
                {improvement.repsGain ? (
                  <ProgressMark
                    icon="medal.fill"
                    value={`+${improvement.repsGain}`}
                    size={17}
                  />
                ) : null}
                {improvement.weightGainKg ? (
                  <ProgressMark
                    icon="dumbbell.fill"
                    value={`+${displayWeightGain(improvement.weightGainKg, weightUnit)}`}
                    size={17}
                  />
                ) : null}
              </View>
            ) : (
              <Text className="text-sm text-muted">
                {Math.round(progress)} %
              </Text>
            )}
          </View>
          <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-background">
            <Animated.View
              style={[
                {
                  height: "100%",
                  backgroundColor:
                    progress === 100
                      ? ZAYMAX_DESIGN.colors.success
                      : colors.foreground,
                },
                progressStyle,
              ]}
            />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { pointerEvents: "none", backgroundColor: GOLD },
                goldStyle,
              ]}
            />
          </View>
        </View>

        <View
          className="mt-3 bg-surface p-[18px]"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: ZAYMAX_DESIGN.radius.card,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ZaymaxWatermark />
              <View className="ml-3">
                <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                  {t("PAUSENTIMER", "REST TIMER")}
                </Text>
                <Text className="mt-2 text-4xl font-bold text-foreground">
                  {timerText}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityLabel={
                  timerRunning
                    ? t("Timer pausieren", "Pause timer")
                    : t("Timer starten", "Start timer")
                }
                onPress={() => {
                  if (timerRunning) {
                    hapticTap();
                    setTimerRunning(false);
                  } else {
                    startRest();
                  }
                }}
                style={({ pressed }) => [
                  {
                    width: 46,
                    height: 46,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <IconSymbol
                  name={timerRunning ? "pause.fill" : "play.fill"}
                  size={21}
                  color={colors.background}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={t("Timer zurücksetzen", "Reset timer")}
                onPress={resetRest}
                style={({ pressed }) => [
                  {
                    width: 46,
                    height: 46,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    borderWidth: 1,
                    borderColor: `${colors.primary}70`,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <IconSymbol
                  name="arrow.counterclockwise"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <Text className="mt-8 text-xl font-black uppercase text-foreground">
          {t("Deine Sätze", "Your sets")}
        </Text>
        <Text className="mt-1 text-sm text-muted">
          {t(
            "Passe Satzanzahl, Wiederholungen und Gewicht direkt an.",
            "Adjust sets, repetitions and weight directly.",
          )}
        </Text>

        {workout.exercises.map((exercise, exerciseIndex) => {
          const values = session.setValues[exercise.id] ?? [];
          const checkedSets = session.completedSets[exercise.id] ?? [];
          return (
            <Animated.View
              key={exercise.id}
              entering={FadeInDown.delay(
                Math.min(exerciseIndex * 35, 140),
              ).duration(ZAYMAX_DESIGN.motion.standard)}
              layout={Layout.duration(ZAYMAX_DESIGN.motion.quick)}
              className="mt-3 bg-surface p-4"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.card,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-black text-foreground">
                    {exercise.name}
                  </Text>
                  <Text className="mt-1 text-sm text-muted">
                    {checkedSets.filter(Boolean).length}/{values.length}{" "}
                    {t("geschafft", "completed")}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityLabel={t("Satz entfernen", "Remove set")}
                    onPress={() => removeSet(exercise.id)}
                    disabled={values.length <= 1}
                    style={({ pressed }) => [
                      {
                        width: 38,
                        height: 38,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: ZAYMAX_DESIGN.radius.round,
                        borderWidth: 1,
                        borderColor: colors.border,
                        opacity: values.length <= 1 ? 0.3 : pressed ? 0.55 : 1,
                      },
                    ]}
                  >
                    <IconSymbol
                      name="minus"
                      size={20}
                      color={colors.foreground}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t("Satz hinzufügen", "Add set")}
                    onPress={() => addSet(exercise.id)}
                    disabled={values.length >= 20}
                    style={({ pressed }) => [
                      {
                        width: 38,
                        height: 38,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: ZAYMAX_DESIGN.radius.round,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        opacity: values.length >= 20 ? 0.3 : pressed ? 0.55 : 1,
                      },
                    ]}
                  >
                    <IconSymbol
                      name="plus"
                      size={20}
                      color={colors.foreground}
                    />
                  </Pressable>
                </View>
              </View>

              <View className="mt-4 gap-2">
                {values.map((value, setIndex) => {
                  const checked = checkedSets[setIndex] ?? false;
                  const baseline =
                    session.baselineSetValues[exercise.id]?.[setIndex] ?? value;
                  const gains = gainsForSet(value, baseline);
                  const hasGain = gains.repsGain > 0 || gains.weightGainKg > 0;
                  const shownWeight =
                    value.weightKg === null
                      ? 0
                      : weightUnit === "lbs"
                        ? value.weightKg * 2.20462
                        : value.weightKg;
                  return (
                    <View
                      key={setIndex}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: ZAYMAX_DESIGN.radius.nested,
                        borderWidth: 1,
                        borderColor: checked
                          ? ZAYMAX_DESIGN.colors.goldLine
                          : colors.border,
                        backgroundColor: checked
                          ? ZAYMAX_DESIGN.colors.successSoft
                          : colors.background,
                        padding: 12,
                      }}
                    >
                      {improvement?.exerciseId === exercise.id &&
                      improvement.setIndex === setIndex &&
                      improvement.repsGain > 0 &&
                      improvement.weightGainKg > 0 ? (
                        <GoldConfetti burst={improvement.sequence} />
                      ) : null}
                      <View className="flex-row items-center">
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          accessibilityLabel={t(
                            `Satz ${setIndex + 1} abhaken`,
                            `Complete set ${setIndex + 1}`,
                            `Oznacz serię ${setIndex + 1} jako ukończoną`,
                          )}
                          onPress={() => toggleSet(exercise.id, setIndex)}
                          style={({ pressed }) => [
                            {
                              width: 34,
                              height: 34,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: ZAYMAX_DESIGN.radius.round,
                              borderWidth: 1,
                              borderColor: checked
                                ? ZAYMAX_DESIGN.colors.success
                                : colors.muted,
                              backgroundColor: checked
                                ? ZAYMAX_DESIGN.colors.success
                                : "transparent",
                              opacity: pressed ? 0.65 : 1,
                            },
                          ]}
                        >
                          {checked ? (
                            <Text
                              style={{
                                color: colors.background,
                                fontWeight: "900",
                              }}
                            >
                              ✓
                            </Text>
                          ) : null}
                        </Pressable>
                        <Text
                          style={{
                            marginLeft: 11,
                            flex: 1,
                            fontSize: 12,
                            fontWeight: "800",
                            letterSpacing: 1.2,
                            color: colors.muted,
                          }}
                        >
                          {t("SATZ", "SET")}{" "}
                          {String(setIndex + 1).padStart(2, "0")}
                        </Text>
                        {hasGain ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 7,
                              borderWidth: 1,
                              borderColor: `${GOLD}99`,
                              backgroundColor: ZAYMAX_DESIGN.colors.goldSoft,
                              borderRadius: ZAYMAX_DESIGN.radius.round,
                              paddingHorizontal: 7,
                              paddingVertical: 4,
                            }}
                          >
                            {gains.repsGain ? (
                              <ProgressMark
                                icon="medal.fill"
                                value={`+${gains.repsGain}`}
                                size={15}
                              />
                            ) : null}
                            {gains.weightGainKg ? (
                              <ProgressMark
                                icon="dumbbell.fill"
                                value={`+${displayWeightGain(gains.weightGainKg, weightUnit)}`}
                                size={15}
                              />
                            ) : null}
                          </View>
                        ) : null}
                      </View>

                      <View className="mt-3 flex-row gap-2">
                        <NumberField
                          label={t("Wiederholungen", "Repetitions")}
                          value={value.reps}
                          integer
                          colors={colors}
                          onDecrease={() =>
                            changeReps(
                              exercise.id,
                              setIndex,
                              Math.max(0, value.reps - 1),
                            )
                          }
                          onIncrease={() =>
                            changeReps(exercise.id, setIndex, value.reps + 1)
                          }
                          onChange={(nextValue) =>
                            changeReps(exercise.id, setIndex, nextValue)
                          }
                        />
                        <NumberField
                          label={t(
                            `Gewicht (${weightUnit})`,
                            `Weight (${weightUnit})`,
                            `Ciężar (${weightUnit})`,
                          )}
                          value={shownWeight}
                          colors={colors}
                          onDecrease={() => {
                            const step = weightUnit === "kg" ? 0.5 : 1;
                            changeWeight(
                              exercise.id,
                              setIndex,
                              Number(
                                Math.max(0, shownWeight - step).toFixed(1),
                              ),
                            );
                          }}
                          onIncrease={() => {
                            const step = weightUnit === "kg" ? 0.5 : 1;
                            changeWeight(
                              exercise.id,
                              setIndex,
                              Number((shownWeight + step).toFixed(1)),
                            );
                          }}
                          onChange={(nextValue) =>
                            changeWeight(exercise.id, setIndex, nextValue)
                          }
                        />
                      </View>
                      <Text
                        style={{
                          marginTop: 10,
                          fontSize: 11,
                          color: colors.muted,
                        }}
                      >
                        {t("Letztes Mal", "Last time")}: {baseline.reps}{" "}
                        {t("Wdh.", "reps")} ·{" "}
                        {baseline.weightKg
                          ? displayWeight(baseline.weightKg, weightUnit)
                          : t("ohne Gewicht", "no weight")}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Pressable
                onPress={startRest}
                style={({ pressed }) => [
                  {
                    marginTop: 13,
                    alignSelf: "flex-start",
                    opacity: pressed ? 0.55 : 1,
                  },
                ]}
              >
                <Text className="text-sm font-semibold text-muted">
                  {t("Pause starten", "Start rest")}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}

        <Pressable
          onPress={finish}
          style={({ pressed }) => [
            {
              marginTop: 20,
              borderRadius: ZAYMAX_DESIGN.radius.round,
              backgroundColor: colors.primary,
              paddingVertical: 16,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text className="text-center font-black tracking-[0.4px] text-background">
            {t("Workout beenden", "Finish workout")}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={effortPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !finishing && setEffortPromptVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 22,
            backgroundColor: ZAYMAX_DESIGN.colors.overlay,
          }}
        >
          <View
            style={{
              borderRadius: ZAYMAX_DESIGN.radius.hero,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 20,
              ...ZAYMAX_DESIGN.shadow,
            }}
          >
            <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
              {t("TRAINING ABGESCHLOSSEN", "WORKOUT COMPLETED")}
            </Text>
            <Text className="mt-2 text-3xl font-black uppercase text-foreground">
              {t("Wie war’s?", "How was it?")}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              {t(
                "Deine Antwort wird in der Historie gespeichert.",
                "Your answer will be saved in your history.",
              )}
            </Text>
            <View className="mt-5 gap-2">
              {EFFORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  disabled={finishing}
                  onPress={() => {
                    hapticSelection();
                    void completeWorkout(option.value);
                  }}
                  style={({ pressed }) => [
                    {
                      minHeight: 56,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: ZAYMAX_DESIGN.radius.nested,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                      paddingHorizontal: 15,
                      opacity: finishing ? 0.45 : pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text className="font-bold text-foreground">
                    {t(option.deLabel, option.enLabel, option.plLabel)}
                  </Text>
                  <Text className="text-sm text-muted">
                    {t(option.deDetail, option.enDetail, option.plDetail)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={finishing}
              onPress={() => {
                hapticTap();
                setEffortPromptVisible(false);
              }}
              style={({ pressed }) => [
                {
                  marginTop: 14,
                  paddingVertical: 11,
                  opacity: finishing ? 0.35 : pressed ? 0.55 : 1,
                },
              ]}
            >
              <Text className="text-center text-sm font-semibold text-muted">
                {finishing
                  ? t("Wird gespeichert …", "Saving …")
                  : t("Zurück zum Training", "Back to workout")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(completionSummary)}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 22,
            backgroundColor: ZAYMAX_DESIGN.colors.overlay,
          }}
        >
          {completionSummary ? (
            <View
              style={{
                borderRadius: ZAYMAX_DESIGN.radius.hero,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: 20,
                ...ZAYMAX_DESIGN.shadow,
              }}
            >
              <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                {t("WORKOUT GESPEICHERT", "WORKOUT SAVED")}
              </Text>
              <Text className="mt-2 text-3xl font-black uppercase text-foreground">
                {t("Stark abgeschlossen.", "Strong finish.")}
              </Text>
              <Text className="mt-2 text-sm text-muted">
                {t("Gefühl", "Feeling")} ·{" "}
                {EFFORT_OPTIONS.find(
                  (option) => option.value === completionSummary.effort,
                )
                  ? t(
                      EFFORT_OPTIONS.find(
                        (option) => option.value === completionSummary.effort,
                      )!.deLabel,
                      EFFORT_OPTIONS.find(
                        (option) => option.value === completionSummary.effort,
                      )!.enLabel,
                      EFFORT_OPTIONS.find(
                        (option) => option.value === completionSummary.effort,
                      )!.plLabel,
                    )
                  : ""}
              </Text>
              <View className="mt-5 flex-row flex-wrap gap-2">
                <SummaryMetric
                  label={t("Dauer", "Duration")}
                  value={formatWorkoutDuration(
                    completionSummary.durationSeconds,
                    language,
                  )}
                  colors={colors}
                />
                <SummaryMetric
                  label={t("Sätze", "Sets")}
                  value={String(completionSummary.completedSets)}
                  colors={colors}
                />
                <SummaryMetric
                  label={t("Volumen", "Volume")}
                  value={formatVolume(
                    completionSummary.totalVolumeKg,
                    weightUnit,
                  )}
                  colors={colors}
                />
                <SummaryMetric
                  label={t("Sätze verbessert", "Sets improved")}
                  value={String(completionSummary.improvementCount)}
                  colors={colors}
                  accent={completionSummary.improvementCount > 0}
                />
                <SummaryMetric
                  label={t("Neue Übungsrekorde", "New exercise records")}
                  value={String(completionSummary.personalBestCount)}
                  colors={colors}
                  accent={completionSummary.personalBestCount > 0}
                  wide
                />
              </View>
              <View
                style={{
                  marginTop: 10,
                  borderRadius: ZAYMAX_DESIGN.radius.nested,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                  padding: 13,
                }}
              >
                <Text className="text-xs font-bold leading-5 text-muted">
                  {t(
                    "Sätze verbessert: mehr Wiederholungen oder Gewicht als beim letzten Training.",
                    "Sets improved: more repetitions or weight than in your last workout.",
                  )}
                </Text>
                <Text className="mt-1 text-xs font-bold leading-5 text-muted">
                  {t(
                    "Neue Übungsrekorde: dein bisher höchster Wert bei Wiederholungen oder Gewicht.",
                    "New exercise records: your highest repetition or weight value so far.",
                  )}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t(
                  "Zusammenfassung schließen",
                  "Close summary",
                )}
                onPress={() => {
                  hapticTap();
                  router.replace("/");
                }}
                style={({ pressed }) => [
                  {
                    marginTop: 18,
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    backgroundColor: colors.primary,
                    paddingVertical: 15,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text className="text-center font-black tracking-[0.4px] text-background">
                  {t("Fertig", "Done")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function formatVolume(volumeKg: number, unit: WeightUnit) {
  const value = unit === "lbs" ? volumeKg * 2.20462 : volumeKg;
  return `${Number(value.toFixed(1))} ${unit}`;
}

function SummaryMetric({
  label,
  value,
  colors,
  wide = false,
  accent = false,
}: {
  label: string;
  value: string;
  colors: any;
  wide?: boolean;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        width: wide ? "100%" : "48.5%",
        borderRadius: ZAYMAX_DESIGN.radius.nested,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
        padding: 13,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 1.2,
          color: colors.muted,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          marginTop: 6,
          fontSize: 18,
          fontWeight: "800",
          color: accent ? GOLD : colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ProgressMark({
  icon,
  value,
  size,
}: {
  icon: "medal.fill" | "dumbbell.fill";
  value: string;
  size: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <IconSymbol name={icon} size={size} color={GOLD} />
      <Text
        style={{ marginLeft: 4, color: GOLD, fontSize: 12, fontWeight: "800" }}
      >
        {value}
      </Text>
    </View>
  );
}

const CONFETTI_PIECES = [
  { x: -76, y: 46, rotate: -105 },
  { x: -54, y: 64, rotate: 80 },
  { x: -31, y: 40, rotate: -55 },
  { x: -10, y: 70, rotate: 120 },
  { x: 18, y: 48, rotate: -90 },
  { x: 40, y: 67, rotate: 65 },
  { x: 62, y: 43, rotate: -125 },
  { x: 82, y: 59, rotate: 100 },
] as const;

function GoldConfetti({ burst }: { burst: number }) {
  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: "none", zIndex: 2 }]}
    >
      {CONFETTI_PIECES.map((piece, index) => (
        <ConfettiPiece key={`${burst}-${index}`} index={index} {...piece} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  index,
  x,
  y,
  rotate,
}: {
  index: number;
  x: number;
  y: number;
  rotate: number;
}) {
  const travel = useSharedValue(0);
  useEffect(() => {
    travel.value = 0;
    travel.value = withDelay(index * 18, withTiming(1, { duration: 720 }));
  }, [index, travel]);
  const style = useAnimatedStyle(() => ({
    opacity:
      travel.value < 0.18 ? travel.value * 5.5 : Math.max(0, 1 - travel.value),
    transform: [
      { translateX: x * travel.value },
      { translateY: y * travel.value },
      { rotate: `${rotate * travel.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 64,
          left: "50%",
          width: index % 2 ? 8 : 6,
          height: index % 2 ? 8 : 6,
          borderRadius: 999,
          backgroundColor: index % 2 ? GOLD : "#E2CA79",
        },
        style,
      ]}
    />
  );
}

function NumberField({
  label,
  value,
  integer = false,
  colors,
  onDecrease,
  onIncrease,
  onChange,
}: {
  label: string;
  value: number;
  integer?: boolean;
  colors: any;
  onDecrease?: () => void;
  onIncrease?: () => void;
  onChange: (value: number) => void;
}) {
  const { language, t } = useLanguage();
  const formattedValue = integer
    ? String(Math.round(value))
    : value > 0
      ? String(Number(value.toFixed(1))).replace(
          ".",
          usesDecimalComma(language) ? "," : ".",
        )
      : "";
  const [draft, setDraft] = useState(formattedValue);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formattedValue);
  }, [focused, formattedValue]);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          marginBottom: 6,
          minHeight: 26,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
          {label}
        </Text>
        {onDecrease && onIncrease ? (
          <View style={{ flexDirection: "row", gap: 5 }}>
            <Pressable
              accessibilityLabel={`${label} ${t("verringern", "decrease")}`}
              onPress={() => {
                hapticSelection();
                onDecrease();
              }}
              style={({ pressed }) => [
                {
                  width: 30,
                  height: 30,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  borderWidth: 1,
                  borderColor: `${colors.primary}55`,
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <IconSymbol name="minus" size={15} color={colors.foreground} />
            </Pressable>
            <Pressable
              accessibilityLabel={`${label} ${t("erhöhen", "increase")}`}
              onPress={() => {
                hapticSelection();
                onIncrease();
              }}
              style={({ pressed }) => [
                {
                  width: 30,
                  height: 30,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  borderWidth: 1,
                  borderColor: `${colors.primary}55`,
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <IconSymbol name="plus" size={15} color={colors.foreground} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <TextInput
        accessibilityLabel={label}
        value={draft}
        selectTextOnFocus
        maxLength={integer ? 3 : 6}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDraft(formattedValue);
        }}
        onChangeText={(text) => {
          const normalized = integer
            ? text.replace(/\D/g, "")
            : text.replace(",", ".").replace(/[^0-9.]/g, "");
          setDraft(
            integer
              ? normalized
              : normalized.replace(".", usesDecimalComma(language) ? "," : "."),
          );
          const parsed = Number(normalized);
          if (normalized !== "" && Number.isFinite(parsed)) onChange(parsed);
          if (normalized === "" && !integer) onChange(0);
        }}
        style={{
          height: 58,
          borderRadius: ZAYMAX_DESIGN.radius.input,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 10,
          textAlign: "center",
          color: colors.foreground,
          fontSize: 22,
          fontWeight: "900",
        }}
      />
    </View>
  );
}
