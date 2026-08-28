import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  PixelRatio,
  Platform,
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
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

import { GlassMaterial } from "@/components/glass-material";
import { ScreenContainer } from "@/components/screen-container";
import { TrainingStory } from "@/components/training-story";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import {
  clearActiveSession,
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
import { createSerialTaskQueue } from "@/lib/serial-task-queue";
import {
  calculateRunningWorkoutSeconds,
  calculateWorkoutDurationSeconds,
  formatWorkoutDuration,
  formatWorkoutClock,
  normalizeWorkoutStartedAt,
} from "@/lib/workout-duration";

const DEFAULT_REST = 90;
const PROGRESS_GOLD = ZAYMAX_DESIGN.colors.gold;
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
  workoutTitle: string;
  exerciseCount: number;
  skippedExerciseCount: number;
  durationSeconds: number;
  completedSets: number;
  totalVolumeKg: number;
  improvementCount: number;
  personalBestCount: number;
  effort: WorkoutEffort;
};

function displayWeightGain(weightGainKg: number, unit: WeightUnit) {
  const value = unit === "lbs" ? weightGainKg * 2.20462 : weightGainKg;
  return Number(value.toFixed(2));
}

function restSecondsRemaining(
  restEndsAt: string | undefined,
  nowMs = Date.now(),
) {
  if (!restEndsAt) return 0;
  const endMs = Date.parse(restEndsAt);
  if (!Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.min(600, Math.ceil((endMs - nowMs) / 1000)));
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
  const [restDisplayRemaining, setRestDisplayRemaining] = useState(0);
  const [workoutElapsedSeconds, setWorkoutElapsedSeconds] = useState(0);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [effortPromptVisible, setEffortPromptVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [sharePreviewVisible, setSharePreviewVisible] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);
  const finishingRef = useRef(false);
  const abortingRef = useRef(false);
  const sessionRef = useRef<ActiveSession | null>(null);
  const sessionWriteQueue = useRef(createSerialTaskQueue()).current;
  const finishRequestedAtRef = useRef<number | null>(null);
  const storyRef = useRef<View>(null);
  const [completionSummary, setCompletionSummary] =
    useState<CompletionSummary | null>(null);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const improvementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const improvementSequence = useRef(0);
  const saveWarningShown = useRef(false);
  const emeraldFlash = useSharedValue(0);
  const emeraldStyle = useAnimatedStyle(() => ({
    opacity: emeraldFlash.value,
  }));
  const progressFill = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressFill.value}%` as `${number}%`,
  }));

  const updateSession = useCallback(
    (updater: (current: ActiveSession) => ActiveSession) => {
      if (finishingRef.current || abortingRef.current) return;
      const current = sessionRef.current;
      if (!current) return;
      const next = updater(current);
      sessionRef.current = next;
      setSession(next);
    },
    [],
  );

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
        if (existing?.workoutId && existing.workoutId !== id) {
          const existingWorkout = allWorkouts.find(
            (item) => item.id === existing.workoutId,
          );
          if (existingWorkout) {
            if (mounted) {
              router.replace({
                pathname: "/workout/active/[id]",
                params: { id: existingWorkout.id },
              });
            }
            return;
          }
          await clearActiveSession();
        }
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
          // Kept in storage for backwards compatibility. The visible and
          // final duration is derived from startedAt so iOS suspension counts.
          activeElapsedSeconds: 0,
          skippedExercises: canResume
            ? { ...(existing.skippedExercises ?? {}) }
            : {},
          completedSets: {},
          setValues: {},
          baselineSetValues: {},
          restSeconds: settings.restSeconds || DEFAULT_REST,
          restRemaining: canResume ? (existing.restRemaining ?? 0) : 0,
          restEndsAt: canResume ? existing.restEndsAt : undefined,
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

        const resumedRest = restSecondsRemaining(initial.restEndsAt);
        if (resumedRest > 0) {
          initial.restRemaining = resumedRest;
        } else {
          const pausedRest = initial.restEndsAt
            ? 0
            : Math.max(0, Math.min(600, initial.restRemaining));
          initial.restEndsAt = undefined;
          initial.restRemaining = pausedRest;
        }
        await saveActiveSession(initial);
        if (!mounted) return;
        setWorkout(found);
        setWeightUnit(settings.weightUnit);
        sessionRef.current = initial;
        setWorkoutElapsedSeconds(
          calculateRunningWorkoutSeconds(
            initial.startedAt,
            Date.parse(openedAt),
          ),
        );
        setRestDisplayRemaining(initial.restRemaining);
        setTimerRunning(Boolean(initial.restEndsAt));
        setSession(initial);
      } catch {
        if (mounted) setLoadIssue("failed");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, router]);

  useEffect(() => {
    const updateClock = () => {
      const current = sessionRef.current;
      if (!current) return;
      const elapsed = calculateRunningWorkoutSeconds(
        current.startedAt,
        finishRequestedAtRef.current ?? Date.now(),
      );
      setWorkoutElapsedSeconds(elapsed);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!timerRunning || !session?.restEndsAt) return;
    const tick = () => {
      const remaining = restSecondsRemaining(session.restEndsAt);
      setRestDisplayRemaining(remaining);
      if (remaining > 0) return;

      setTimerRunning(false);
      updateSession((current) => ({
        ...current,
        restRemaining: 0,
        restEndsAt: undefined,
      }));
      hapticWarning();
    };
    tick();
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.restEndsAt, timerRunning, updateSession]);

  useEffect(() => {
    if (!session || finishingRef.current || abortingRef.current) return;
    void sessionWriteQueue
      .enqueue(() => saveActiveSession(session))
      .catch(() => {
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
  }, [session, sessionWriteQueue, t]);

  useEffect(
    () => () => {
      if (improvementTimer.current) clearTimeout(improvementTimer.current);
    },
    [],
  );

  const completedCount = useMemo(
    () =>
      session
        ? Object.entries(session.completedSets).reduce(
            (sum, [exerciseId, sets]) =>
              session.skippedExercises[exerciseId]
                ? sum
                : sum + sets.filter(Boolean).length,
            0,
          )
        : 0,
    [session],
  );
  const totalSets = useMemo(
    () =>
      session
        ? Object.entries(session.setValues).reduce(
            (sum, [exerciseId, values]) =>
              session.skippedExercises[exerciseId] ? sum : sum + values.length,
            0,
          )
        : 0,
    [session],
  );
  const progress =
    totalSets === 0 ? 100 : Math.min(100, (completedCount / totalSets) * 100);
  const timerText = `${String(Math.floor(restDisplayRemaining / 60)).padStart(2, "0")}:${String(restDisplayRemaining % 60).padStart(2, "0")}`;

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
    updateSession((current) => {
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
      sessionRef.current?.baselineSetValues[exerciseId]?.[setIndex] ?? value;
    const gains = gainsForSet(value, baseline);
    if (!gains.repsGain && !gains.weightGainKg) return;
    improvementSequence.current += 1;
    setImprovement({
      exerciseId,
      setIndex,
      ...gains,
      sequence: improvementSequence.current,
    });
    emeraldFlash.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(520, withTiming(0, { duration: 420 })),
    );
    if (improvementTimer.current) clearTimeout(improvementTimer.current);
    improvementTimer.current = setTimeout(() => setImprovement(null), 1400);
    hapticSuccess();
  }

  function changeReps(exerciseId: string, setIndex: number, reps: number) {
    const safeReps = Math.max(0, Math.min(999, Math.round(reps)));
    const currentSession = sessionRef.current;
    const currentValue = currentSession?.setValues[exerciseId]?.[setIndex] ?? {
      reps: 0,
      weightKg: null,
    };
    const previous = currentValue.reps;
    const baseline =
      currentSession?.baselineSetValues[exerciseId]?.[setIndex]?.reps ??
      previous;
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
    const currentSession = sessionRef.current;
    const currentValue = currentSession?.setValues[exerciseId]?.[setIndex] ?? {
      reps: 0,
      weightKg: null,
    };
    const previousWeightKg = currentValue.weightKg ?? 0;
    const baselineWeightKg =
      currentSession?.baselineSetValues[exerciseId]?.[setIndex]?.weightKg ?? 0;
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

  function adjustReps(exerciseId: string, setIndex: number, delta: number) {
    const current =
      sessionRef.current?.setValues[exerciseId]?.[setIndex]?.reps ?? 0;
    changeReps(exerciseId, setIndex, current + delta);
  }

  function adjustWeight(exerciseId: string, setIndex: number, delta: number) {
    const weightKg =
      sessionRef.current?.setValues[exerciseId]?.[setIndex]?.weightKg ?? 0;
    const displayed = weightUnit === "lbs" ? weightKg * 2.20462 : weightKg;
    changeWeight(
      exerciseId,
      setIndex,
      Number(Math.max(0, displayed + delta).toFixed(2)),
    );
  }

  function addSet(exerciseId: string) {
    updateSession((current) => {
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
    updateSession((current) => {
      if ((current.setValues[exerciseId]?.length ?? 0) <= 1) return current;
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

  function toggleExerciseSkipped(exerciseId: string) {
    updateSession((current) => {
      const skipped = !current.skippedExercises[exerciseId];
      return {
        ...current,
        skippedExercises: {
          ...current.skippedExercises,
          [exerciseId]: skipped,
        },
      };
    });
    hapticSelection();
  }

  function toggleSet(exerciseId: string, setIndex: number) {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    hapticTap();
    const willBeChecked = !(
      currentSession.completedSets[exerciseId]?.[setIndex] ?? false
    );
    updateSession((current) => {
      const checks = [...(current.completedSets[exerciseId] ?? [])];
      checks[setIndex] = !checks[setIndex];
      return {
        ...current,
        completedSets: { ...current.completedSets, [exerciseId]: checks },
      };
    });
    if (willBeChecked) runRest(currentSession.restSeconds);
  }

  function runRest(seconds: number) {
    const duration = Math.max(1, Math.min(600, Math.round(seconds)));
    const restEndsAt = new Date(Date.now() + duration * 1000).toISOString();
    setRestDisplayRemaining(duration);
    setTimerRunning(true);
    updateSession((current) => ({
      ...current,
      restRemaining: duration,
      restEndsAt,
    }));
  }

  function startRest() {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    hapticTap();
    runRest(currentSession.restSeconds);
  }

  function pauseRest() {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    hapticTap();
    const remaining = restSecondsRemaining(currentSession.restEndsAt);
    setTimerRunning(false);
    setRestDisplayRemaining(remaining);
    updateSession((current) => ({
      ...current,
      restRemaining: remaining,
      restEndsAt: undefined,
    }));
  }

  function resumeRest() {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    hapticTap();
    runRest(restDisplayRemaining || currentSession.restSeconds);
  }

  function resetRest() {
    hapticSelection();
    setTimerRunning(false);
    setRestDisplayRemaining(0);
    updateSession((current) => ({
      ...current,
      restRemaining: 0,
      restEndsAt: undefined,
    }));
  }

  function openEffortPrompt() {
    const requestedAt = Date.now();
    finishRequestedAtRef.current = requestedAt;
    const current = sessionRef.current;
    if (current) {
      setWorkoutElapsedSeconds(
        calculateRunningWorkoutSeconds(current.startedAt, requestedAt),
      );
    }
    setEffortPromptVisible(true);
  }

  function closeEffortPrompt() {
    if (finishing) return;
    setEffortPromptVisible(false);
    finishRequestedAtRef.current = null;
  }

  function confirmAbortWorkout() {
    if (aborting || finishing) return;
    hapticWarning();
    Alert.alert(
      t("Training abbrechen?", "Cancel workout?", "Przerwać trening?"),
      t(
        "Die laufende Trainingseinheit wird verworfen. Änderungen aus diesem Training erscheinen nicht in deiner Historie und verändern deinen Trainingsplan nicht.",
        "The active workout will be discarded. Changes from this session will not appear in your history or modify your workout plan.",
        "Bieżący trening zostanie odrzucony. Zmiany z tej sesji nie pojawią się w historii ani nie zmienią planu treningowego.",
      ),
      [
        {
          text: t("Weiter trainieren", "Keep training", "Kontynuuj trening"),
          style: "cancel",
        },
        {
          text: t("Training abbrechen", "Cancel workout", "Przerwij trening"),
          style: "destructive",
          onPress: () => void abortWorkout(),
        },
      ],
    );
  }

  async function abortWorkout() {
    if (abortingRef.current || finishingRef.current) return;
    abortingRef.current = true;
    setAborting(true);
    finishRequestedAtRef.current = Date.now();
    setTimerRunning(false);
    try {
      await sessionWriteQueue.invalidateAndDrain();
      await clearActiveSession();
      sessionRef.current = null;
      setSession(null);
      hapticSuccess();
      router.replace("/");
    } catch {
      finishRequestedAtRef.current = null;
      const activeRestEnd = sessionRef.current?.restEndsAt;
      if (activeRestEnd && restSecondsRemaining(activeRestEnd) > 0) {
        setRestDisplayRemaining(restSecondsRemaining(activeRestEnd));
        setTimerRunning(true);
      }
      hapticWarning();
      Alert.alert(
        t(
          "Training nicht abgebrochen",
          "Workout not cancelled",
          "Nie przerwano treningu",
        ),
        t(
          "Die laufende Einheit bleibt erhalten. Bitte versuche es erneut.",
          "The active session is still saved. Please try again.",
          "Bieżąca sesja nadal jest zapisana. Spróbuj ponownie.",
        ),
      );
    } finally {
      abortingRef.current = false;
      setAborting(false);
    }
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
            onPress: openEffortPrompt,
          },
        ],
      );
      return;
    }
    openEffortPrompt();
  }

  async function completeWorkout(effort: WorkoutEffort) {
    if (!workout || !session || finishingRef.current || abortingRef.current)
      return;
    const activeSession = sessionRef.current ?? session;
    finishingRef.current = true;
    setFinishing(true);
    try {
      await sessionWriteQueue.invalidateAndDrain();
      await saveActiveSession(activeSession);
      const completedAt = new Date(
        finishRequestedAtRef.current ?? Date.now(),
      ).toISOString();
      const [all, history] = await Promise.all([
        loadWorkouts(),
        loadWorkoutHistory(),
      ]);
      const historyExercises = workout.exercises
        .map((exercise) => {
          const skipped = Boolean(activeSession.skippedExercises[exercise.id]);
          if (skipped) {
            return {
              exerciseId: exercise.id,
              name: exercise.name,
              skipped: true,
              sets: [],
            };
          }
          const values = activeSession.setValues[exercise.id] ?? [];
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
              (setIndex) =>
                activeSession.completedSets[exercise.id]?.[setIndex],
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
            skipped: undefined,
            sets: values.flatMap((value, setIndex) => {
              if (!activeSession.completedSets[exercise.id]?.[setIndex])
                return [];
              const baseline =
                activeSession.baselineSetValues[exercise.id]?.[setIndex] ??
                value;
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
        .filter((exercise) => exercise.skipped || exercise.sets.length > 0);
      const completedHistorySets = historyExercises.flatMap(
        (exercise) => exercise.sets,
      );
      const durationSeconds = Math.max(
        1,
        calculateWorkoutDurationSeconds(activeSession.startedAt, completedAt),
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
        startedAt: activeSession.startedAt,
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
            if (activeSession.skippedExercises[exercise.id]) return exercise;
            const values =
              activeSession.setValues[exercise.id] ??
              setValuesForExercise(exercise);
            const completedValues = completedValuesForTemplate(
              exercise,
              values,
              activeSession.completedSets[exercise.id] ?? [],
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
      sessionRef.current = null;
      finishRequestedAtRef.current = null;
      setEffortPromptVisible(false);
      setCompletionSummary({
        workoutTitle: workout.title,
        exerciseCount: historyExercises.filter(
          (exercise) => !exercise.skipped && exercise.sets.length > 0,
        ).length,
        skippedExerciseCount: historyExercises.filter(
          (exercise) => exercise.skipped,
        ).length,
        durationSeconds,
        completedSets: completedHistorySets.length,
        totalVolumeKg,
        improvementCount,
        personalBestCount,
        effort,
      });
      hapticSuccess();
    } catch {
      finishRequestedAtRef.current = null;
      setEffortPromptVisible(false);
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

  async function shareTrainingStory() {
    if (!completionSummary || !storyRef.current || sharingStory) return;
    setSharingStory(true);
    try {
      const pixelRatio = PixelRatio.get();
      const width = 1080 / pixelRatio;
      const height = 1920 / pixelRatio;

      if (Platform.OS === "web") {
        const dataUri = await captureRef(storyRef.current, {
          format: "png",
          quality: 1,
          result: "data-uri",
          width,
          height,
        });
        const anchor = document.createElement("a");
        anchor.href = dataUri;
        anchor.download = "zaymax-training-story.png";
        anchor.click();
        hapticSuccess();
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("sharing-unavailable");
      }
      const uri = await captureRef(storyRef.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width,
        height,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: t(
          "Training teilen",
          "Share workout",
          "Udostępnij trening",
        ),
      });
      hapticSuccess();
    } catch {
      hapticWarning();
      Alert.alert(
        t(
          "Story konnte nicht erstellt werden",
          "Story could not be created",
          "Nie udało się utworzyć relacji",
        ),
        t(
          "Bitte versuche es erneut. Dein gespeichertes Training bleibt erhalten.",
          "Please try again. Your saved workout remains available.",
          "Spróbuj ponownie. Zapisany trening pozostaje dostępny.",
        ),
      );
    } finally {
      setSharingStory(false);
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
            backgroundColor: ZAYMAX_DESIGN.colors.action,
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
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 38 }}
      >
        <View className="flex-row items-center pt-3 pb-6">
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
          <View
            accessibilityLabel={t(
              `Trainingszeit ${formatWorkoutClock(workoutElapsedSeconds)}`,
              `Workout time ${formatWorkoutClock(workoutElapsedSeconds)}`,
              `Czas treningu ${formatWorkoutClock(workoutElapsedSeconds)}`,
            )}
            style={{
              minWidth: 88,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: ZAYMAX_DESIGN.radius.round,
              backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <IconSymbol name="timer" size={16} color={colors.foreground} />
            <View>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 8,
                  fontWeight: "900",
                  letterSpacing: 0.8,
                }}
              >
                {t("ZEIT", "TIME", "CZAS")}
              </Text>
              <Text
                style={{
                  marginTop: 1,
                  color: colors.foreground,
                  fontSize: 14,
                  fontWeight: "900",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatWorkoutClock(workoutElapsedSeconds)}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="bg-surface p-[18px]"
          style={{
            position: "relative",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: ZAYMAX_DESIGN.radius.card,
            backgroundColor: "transparent",
            ...ZAYMAX_DESIGN.shadow,
          }}
        >
          <GlassMaterial intensity={28} />
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
                  borderColor: ZAYMAX_DESIGN.colors.goldLine,
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
                {
                  pointerEvents: "none",
                  backgroundColor: ZAYMAX_DESIGN.colors.goldSoft,
                },
                emeraldStyle,
              ]}
            />
          </View>
        </View>

        <View
          className="mt-3 bg-surface p-[18px]"
          style={{
            position: "relative",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: ZAYMAX_DESIGN.radius.card,
            backgroundColor: "transparent",
          }}
        >
          <GlassMaterial intensity={25} />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                }}
              >
                <IconSymbol name="timer" size={18} color={colors.foreground} />
              </View>
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
                  if (timerRunning) pauseRest();
                  else resumeRest();
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
          const skipped = Boolean(session.skippedExercises[exercise.id]);
          return (
            <Animated.View
              key={exercise.id}
              entering={FadeInDown.delay(
                Math.min(exerciseIndex * 35, 140),
              ).duration(ZAYMAX_DESIGN.motion.standard)}
              layout={Layout.duration(ZAYMAX_DESIGN.motion.quick)}
              className="mt-3 bg-surface p-4"
              style={{
                position: "relative",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: skipped ? colors.muted : colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.card,
                backgroundColor: "transparent",
              }}
            >
              <GlassMaterial intensity={skipped ? 15 : 24} />
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-black text-foreground">
                    {exercise.name}
                  </Text>
                  <Text className="mt-1 text-sm text-muted">
                    {skipped
                      ? t("Übersprungen", "Skipped", "Pominięto")
                      : `${checkedSets.filter(Boolean).length}/${values.length} ${t(
                          "geschafft",
                          "completed",
                          "ukończono",
                        )}`}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityLabel={t("Satz entfernen", "Remove set")}
                    onPress={() => removeSet(exercise.id)}
                    disabled={skipped || values.length <= 1}
                    style={({ pressed }) => [
                      {
                        width: 38,
                        height: 38,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: ZAYMAX_DESIGN.radius.round,
                        borderWidth: 1,
                        borderColor: colors.border,
                        opacity:
                          skipped || values.length <= 1
                            ? 0.3
                            : pressed
                              ? 0.55
                              : 1,
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
                    disabled={skipped || values.length >= 20}
                    style={({ pressed }) => [
                      {
                        width: 38,
                        height: 38,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: ZAYMAX_DESIGN.radius.round,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        opacity:
                          skipped || values.length >= 20
                            ? 0.3
                            : pressed
                              ? 0.55
                              : 1,
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

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: skipped }}
                accessibilityLabel={
                  skipped
                    ? t(
                        "Übung heute doch trainieren",
                        "Train exercise today",
                        "Wykonaj ćwiczenie dzisiaj",
                      )
                    : t(
                        "Übung heute auslassen",
                        "Skip exercise today",
                        "Pomiń ćwiczenie dzisiaj",
                      )
                }
                onPress={() => toggleExerciseSkipped(exercise.id)}
                style={({ pressed }) => ({
                  minHeight: 42,
                  marginTop: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  borderWidth: 1,
                  borderColor: skipped ? colors.foreground : colors.border,
                  backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <IconSymbol
                  name={skipped ? "arrow.counterclockwise" : "chevron.right"}
                  size={18}
                  color={colors.foreground}
                />
                <Text className="text-sm font-black text-foreground">
                  {skipped
                    ? t("Doch trainieren", "Train it", "Wykonaj ćwiczenie")
                    : t("Heute auslassen", "Skip today", "Pomiń dzisiaj")}
                </Text>
              </Pressable>

              {skipped ? (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: ZAYMAX_DESIGN.radius.nested,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    padding: 14,
                  }}
                >
                  <Text className="text-center text-sm font-bold text-muted">
                    {t(
                      "Diese Übung wird heute nicht gewertet und bleibt in deinem Workout erhalten.",
                      "This exercise will not count today and stays in your workout.",
                      "To ćwiczenie nie będzie dziś liczone i pozostanie w Twoim treningu.",
                    )}
                  </Text>
                </View>
              ) : null}

              <View
                className="mt-4 gap-2"
                style={{ display: skipped ? "none" : "flex" }}
              >
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
                          ? ZAYMAX_DESIGN.colors.emeraldLine
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
                        <EmeraldConfetti burst={improvement.sequence} />
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
                              borderColor: ZAYMAX_DESIGN.colors.goldLine,
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
                            adjustReps(exercise.id, setIndex, -1)
                          }
                          onIncrease={() =>
                            adjustReps(exercise.id, setIndex, 1)
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
                            adjustWeight(exercise.id, setIndex, -step);
                          }}
                          onIncrease={() => {
                            const step = weightUnit === "kg" ? 0.5 : 1;
                            adjustWeight(exercise.id, setIndex, step);
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
                    display: skipped ? "none" : "flex",
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
          disabled={aborting || finishing}
          style={({ pressed }) => [
            {
              marginTop: 20,
              borderRadius: ZAYMAX_DESIGN.radius.round,
              backgroundColor: ZAYMAX_DESIGN.colors.action,
              paddingVertical: 16,
              opacity: aborting || finishing ? 0.4 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text className="text-center font-black tracking-[0.4px] text-background">
            {t("Workout beenden", "Finish workout")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel={t(
            "Training ohne Speichern abbrechen",
            "Cancel workout without saving",
            "Przerwij trening bez zapisywania",
          )}
          disabled={aborting || finishing}
          onPress={confirmAbortWorkout}
          style={({ pressed }) => [
            {
              marginTop: 10,
              borderRadius: ZAYMAX_DESIGN.radius.round,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingVertical: 14,
              opacity: aborting || finishing ? 0.4 : pressed ? 0.62 : 1,
            },
          ]}
        >
          <Text className="text-center font-bold text-muted">
            {aborting
              ? t("Wird abgebrochen …", "Cancelling …", "Przerywanie …")
              : t("Training abbrechen", "Cancel workout", "Przerwij trening")}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={effortPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEffortPrompt}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: ZAYMAX_DESIGN.colors.overlay }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 22,
          }}
        >
          <View
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: ZAYMAX_DESIGN.radius.hero,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "transparent",
              padding: 20,
              ...ZAYMAX_DESIGN.shadow,
            }}
          >
            <GlassMaterial
              raised
              intensity={34}
              radius={ZAYMAX_DESIGN.radius.hero}
            />
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
                closeEffortPrompt();
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
        </ScrollView>
      </Modal>

      <Modal
        visible={Boolean(completionSummary) && !sharePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: ZAYMAX_DESIGN.colors.overlay }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 22,
          }}
        >
          {completionSummary ? (
            <View
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: ZAYMAX_DESIGN.radius.hero,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "transparent",
                padding: 20,
                ...ZAYMAX_DESIGN.shadow,
              }}
            >
              <GlassMaterial
                raised
                intensity={34}
                radius={ZAYMAX_DESIGN.radius.hero}
              />
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
                  "Training als Story teilen",
                  "Share workout as a story",
                  "Udostępnij trening jako relację",
                )}
                onPress={() => {
                  hapticTap();
                  setSharePreviewVisible(true);
                }}
                style={({ pressed }) => ({
                  minHeight: 50,
                  marginTop: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  borderWidth: 1,
                  borderColor: colors.foreground,
                  backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <IconSymbol
                  name="square.and.arrow.up"
                  size={19}
                  color={colors.foreground}
                />
                <Text className="font-black tracking-[0.3px] text-foreground">
                  {t("Training teilen", "Share workout", "Udostępnij trening")}
                </Text>
              </Pressable>
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
                    marginTop: 10,
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    backgroundColor: ZAYMAX_DESIGN.colors.action,
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
        </ScrollView>
      </Modal>

      <Modal
        visible={sharePreviewVisible && Boolean(completionSummary)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!sharingStory) setSharePreviewVisible(false);
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: ZAYMAX_DESIGN.colors.overlay }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          {completionSummary ? (
            <View
              style={{
                position: "relative",
                overflow: "hidden",
                width: "100%",
                maxWidth: 390,
                borderRadius: ZAYMAX_DESIGN.radius.hero,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "transparent",
                padding: 16,
                ...ZAYMAX_DESIGN.shadow,
              }}
            >
              <GlassMaterial
                raised
                intensity={34}
                radius={ZAYMAX_DESIGN.radius.hero}
              />
              <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                {t("STORY-VORSCHAU", "STORY PREVIEW", "PODGLĄD RELACJI")}
              </Text>
              <View
                style={{
                  width: "72%",
                  maxWidth: 286,
                  marginTop: 13,
                  alignSelf: "center",
                  overflow: "hidden",
                  borderRadius: ZAYMAX_DESIGN.radius.nested,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <TrainingStory
                  ref={storyRef}
                  data={completionSummary}
                  language={language}
                />
              </View>
              <Pressable
                accessibilityLabel={t(
                  "Story jetzt teilen",
                  "Share story now",
                  "Udostępnij relację teraz",
                )}
                disabled={sharingStory}
                onPress={() => void shareTrainingStory()}
                style={({ pressed }) => ({
                  minHeight: 50,
                  marginTop: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  backgroundColor: ZAYMAX_DESIGN.colors.action,
                  opacity: sharingStory ? 0.45 : pressed ? 0.75 : 1,
                })}
              >
                <IconSymbol
                  name="square.and.arrow.up"
                  size={19}
                  color={colors.background}
                />
                <Text className="font-black text-background">
                  {sharingStory
                    ? t(
                        "Bild wird erstellt …",
                        "Creating image …",
                        "Tworzenie obrazu …",
                      )
                    : t(
                        "App zum Teilen auswählen",
                        "Choose an app to share",
                        "Wybierz aplikację do udostępnienia",
                      )}
                </Text>
              </Pressable>
              <Pressable
                disabled={sharingStory}
                onPress={() => {
                  hapticTap();
                  setSharePreviewVisible(false);
                }}
                style={({ pressed }) => ({
                  minHeight: 42,
                  marginTop: 5,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: sharingStory ? 0.3 : pressed ? 0.55 : 1,
                })}
              >
                <Text className="text-sm font-bold text-muted">
                  {t("Zurück", "Back", "Wróć")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </Modal>
    </ScreenContainer>
  );
}

function formatVolume(volumeKg: number, unit: WeightUnit) {
  const value = unit === "lbs" ? volumeKg * 2.20462 : volumeKg;
  return `${Number(value.toFixed(2))} ${unit}`;
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
        borderColor: accent ? ZAYMAX_DESIGN.colors.goldLine : colors.border,
        backgroundColor: accent
          ? ZAYMAX_DESIGN.colors.goldSoft
          : ZAYMAX_DESIGN.colors.surfaceSoft,
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
          color: accent ? PROGRESS_GOLD : colors.foreground,
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
      <IconSymbol name={icon} size={size} color={PROGRESS_GOLD} />
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

function EmeraldConfetti({ burst }: { burst: number }) {
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
          backgroundColor:
            index % 2 ? ZAYMAX_DESIGN.colors.gold : ZAYMAX_DESIGN.colors.action,
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
      ? String(Number(value.toFixed(2))).replace(
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
        maxLength={integer ? 3 : 7}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDraft(formattedValue);
        }}
        onChangeText={(text) => {
          const sanitized = integer
            ? text.replace(/\D/g, "")
            : text.replace(",", ".").replace(/[^0-9.]/g, "");
          const [whole = "", ...decimalParts] = sanitized.split(".");
          const normalized = integer
            ? sanitized
            : decimalParts.length
              ? `${whole}.${decimalParts.join("").slice(0, 2)}`
              : whole;
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
