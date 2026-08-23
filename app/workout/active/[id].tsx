import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  clearActiveSession,
  loadActiveSession,
  loadSettings,
  loadWorkoutHistory,
  loadWorkouts,
  saveActiveSession,
  saveWorkoutHistory,
  saveWorkouts,
  setValuesForExercise,
  toKg,
  uid,
  type ActiveSession,
  type ActiveSetValue,
  type WeightUnit,
  type Workout,
  type WorkoutEffort,
  type WorkoutHistoryEntry,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";

const DEFAULT_REST = 90;
const GOLD = "#C6A752";
const EFFORT_OPTIONS: { value: WorkoutEffort; label: string; detail: string }[] = [
  { value: "leicht", label: "Leicht", detail: "Noch viel Luft" },
  { value: "gut", label: "Gut", detail: "Genau richtig" },
  { value: "hart", label: "Hart", detail: "Am Limit" },
];

type Improvement = { exerciseId: string; setIndex: number; gain: number };

export default function ActiveWorkoutScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [effortPromptVisible, setEffortPromptVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const improvementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goldFlash = useSharedValue(0);
  const goldStyle = useAnimatedStyle(() => ({ opacity: goldFlash.value }));

  useEffect(() => {
    void (async () => {
      const found = (await loadWorkouts()).find((item) => item.id === id);
      if (!found) return;
      const existing = await loadActiveSession();
      const settings = await loadSettings();
      const canResume = existing?.workoutId === id;
      const initial: ActiveSession = {
        workoutId: id!,
        completedSets: {},
        setValues: {},
        baselineSetValues: {},
        restSeconds: settings.restSeconds || DEFAULT_REST,
        restRemaining: canResume ? existing.restRemaining ?? 0 : 0,
      };

      found.exercises.forEach((exercise) => {
        const templateValues = setValuesForExercise(exercise);
        const resumedValues = canResume ? existing.setValues?.[exercise.id] : undefined;
        const values = (resumedValues?.length ? resumedValues : templateValues).map((value) => ({ ...value }));
        const resumedBaseline = canResume ? existing.baselineSetValues?.[exercise.id] : undefined;
        const baseline = values.map((value, setIndex) => ({ ...(resumedBaseline?.[setIndex] ?? templateValues[setIndex] ?? value) }));
        const savedChecks = canResume ? existing.completedSets?.[exercise.id] ?? [] : [];
        initial.setValues[exercise.id] = values;
        initial.baselineSetValues[exercise.id] = baseline;
        initial.completedSets[exercise.id] = values.map((_, setIndex) => savedChecks[setIndex] ?? false);
      });

      setWorkout(found);
      setWeightUnit(settings.weightUnit);
      setSession(initial);
      await saveActiveSession(initial);
    })();
  }, [id]);

  useEffect(() => () => {
    if (improvementTimer.current) clearTimeout(improvementTimer.current);
  }, []);

  const restRemaining = session?.restRemaining ?? 0;
  useEffect(() => {
    if (timerRunning && restRemaining === 0) {
      setTimerRunning(false);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!timerRunning || !restRemaining) return;
    const interval = setInterval(() => {
      setSession((current) => current ? { ...current, restRemaining: Math.max(0, current.restRemaining - 1) } : current);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, restRemaining]);

  useEffect(() => {
    if (session) void saveActiveSession(session);
  }, [session]);

  const completedCount = useMemo(
    () => session ? Object.values(session.completedSets).flat().filter(Boolean).length : 0,
    [session],
  );
  const totalSets = useMemo(
    () => session ? Object.values(session.setValues).reduce((sum, values) => sum + values.length, 0) : 0,
    [session],
  );
  const progress = Math.min(100, (completedCount / Math.max(1, totalSets)) * 100);
  const timerText = session
    ? `${String(Math.floor(session.restRemaining / 60)).padStart(2, "0")}:${String(session.restRemaining % 60).padStart(2, "0")}`
    : "01:30";

  function updateSetValue(exerciseId: string, setIndex: number, patch: Partial<ActiveSetValue>) {
    setSession((current) => {
      if (!current) return current;
      const values = [...(current.setValues[exerciseId] ?? [])];
      values[setIndex] = { ...values[setIndex], ...patch };
      return { ...current, setValues: { ...current.setValues, [exerciseId]: values } };
    });
  }

  function announceImprovement(exerciseId: string, setIndex: number, gain: number) {
    setImprovement({ exerciseId, setIndex, gain });
    goldFlash.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(520, withTiming(0, { duration: 420 })),
    );
    if (improvementTimer.current) clearTimeout(improvementTimer.current);
    improvementTimer.current = setTimeout(() => setImprovement(null), 1400);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function changeReps(exerciseId: string, setIndex: number, reps: number) {
    const safeReps = Math.max(0, Math.min(999, Math.round(reps)));
    const previous = session?.setValues[exerciseId]?.[setIndex]?.reps ?? 0;
    const baseline = session?.baselineSetValues[exerciseId]?.[setIndex]?.reps ?? previous;
    updateSetValue(exerciseId, setIndex, { reps: safeReps });
    const gain = safeReps - baseline;
    if (safeReps > previous && gain > 0) announceImprovement(exerciseId, setIndex, gain);
  }

  function changeWeight(exerciseId: string, setIndex: number, displayValue: number) {
    const safeValue = Math.max(0, Math.min(5000, displayValue));
    updateSetValue(exerciseId, setIndex, { weightKg: safeValue > 0 ? toKg(safeValue, weightUnit) : null });
  }

  function addSet(exerciseId: string) {
    setSession((current) => {
      if (!current) return current;
      const values = [...(current.setValues[exerciseId] ?? [])];
      if (values.length >= 20) return current;
      const nextValue = { ...(values.at(-1) ?? { reps: 10, weightKg: null }) };
      return {
        ...current,
        setValues: { ...current.setValues, [exerciseId]: [...values, nextValue] },
        baselineSetValues: { ...current.baselineSetValues, [exerciseId]: [...(current.baselineSetValues[exerciseId] ?? []), { ...nextValue }] },
        completedSets: { ...current.completedSets, [exerciseId]: [...(current.completedSets[exerciseId] ?? []), false] },
      };
    });
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function removeSet(exerciseId: string) {
    setSession((current) => {
      if (!current || (current.setValues[exerciseId]?.length ?? 0) <= 1) return current;
      return {
        ...current,
        setValues: { ...current.setValues, [exerciseId]: current.setValues[exerciseId].slice(0, -1) },
        baselineSetValues: { ...current.baselineSetValues, [exerciseId]: (current.baselineSetValues[exerciseId] ?? []).slice(0, -1) },
        completedSets: { ...current.completedSets, [exerciseId]: (current.completedSets[exerciseId] ?? []).slice(0, -1) },
      };
    });
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function toggleSet(exerciseId: string, setIndex: number) {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSession((current) => {
      if (!current) return current;
      const checks = [...(current.completedSets[exerciseId] ?? [])];
      checks[setIndex] = !checks[setIndex];
      return {
        ...current,
        completedSets: { ...current.completedSets, [exerciseId]: checks },
        restRemaining: checks[setIndex] ? current.restSeconds : current.restRemaining,
      };
    });
  }

  function startRest() {
    setSession((current) => current ? { ...current, restRemaining: current.restSeconds } : current);
    setTimerRunning(true);
  }

  function resetRest() {
    setTimerRunning(false);
    setSession((current) => current ? { ...current, restRemaining: 0 } : current);
  }

  function finish() {
    if (!workout || !session) return;
    if (completedCount < totalSets) {
      const missing = totalSets - completedCount;
      Alert.alert(
        "Workout noch nicht fertig",
        `Hake noch ${missing} ${missing === 1 ? "Satz" : "Sätze"} ab oder beende das Workout trotzdem.`,
        [
          { text: "Weiter trainieren", style: "cancel" },
          { text: "Trotzdem beenden", onPress: () => setEffortPromptVisible(true) },
        ],
      );
      return;
    }
    setEffortPromptVisible(true);
  }

  async function completeWorkout(effort: WorkoutEffort) {
    if (!workout || !session || finishing) return;
    setFinishing(true);
    const completedAt = new Date().toISOString();
    const historyEntry: WorkoutHistoryEntry = {
      id: uid(),
      workoutId: workout.id,
      workoutTitle: workout.title,
      completedAt,
      effort,
      exercises: workout.exercises.map((exercise) => {
        const values = session.setValues[exercise.id] ?? [];
        return {
          exerciseId: exercise.id,
          name: exercise.name,
          sets: values.flatMap((value, setIndex) =>
            session.completedSets[exercise.id]?.[setIndex]
              ? [{ setNumber: setIndex + 1, reps: value.reps, weightKg: value.weightKg ?? undefined }]
              : [],
          ),
        };
      }).filter((exercise) => exercise.sets.length > 0),
    };
    const [all, history] = await Promise.all([loadWorkouts(), loadWorkoutHistory()]);
    const updatedWorkouts = all.map((item) => {
      if (item.id !== workout.id) return item;
      return {
        ...item,
        completedAt,
        updatedAt: completedAt,
        exercises: item.exercises.map((exercise) => {
          const values = session.setValues[exercise.id] ?? setValuesForExercise(exercise);
          return {
            ...exercise,
            sets: values.length,
            reps: values[0]?.reps ?? exercise.reps,
            repsPerSet: values.map((value) => value.reps),
            weightKg: values[0]?.weightKg ?? undefined,
            weightsPerSetKg: values.map((value) => value.weightKg),
          };
        }),
      };
    });
    await Promise.all([
      saveWorkouts(updatedWorkouts),
      saveWorkoutHistory([historyEntry, ...history]),
    ]);
    await clearActiveSession();
    setEffortPromptVisible(false);
    router.replace("/");
  }

  if (!workout || !session) {
    return <ScreenContainer className="items-center justify-center"><Text className="text-muted">Training wird geladen …</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 38 }}>
        <View className="flex-row items-center pt-3 pb-6">
          <ZaymaxWatermark />
          <Pressable accessibilityLabel="Zurück" onPress={() => router.back()} style={({ pressed }) => [{ padding: 8, marginRight: 8, opacity: pressed ? 0.6 : 1 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-muted">AKTIVES TRAINING</Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">{workout.title}</Text>
          </View>
        </View>

        <View className="rounded-md bg-surface/80 p-5" style={{ borderWidth: 1, borderColor: colors.border }}>
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-[2px] text-muted">SÄTZE</Text>
              <Text className="mt-2 text-3xl font-bold text-foreground">
                {completedCount}<Text className="text-base font-medium text-muted"> / {totalSets}</Text>
              </Text>
            </View>
            {improvement ? (
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: GOLD, borderRadius: 3, paddingHorizontal: 9, paddingVertical: 6 }}>
                <IconSymbol name="medal.fill" size={17} color={GOLD} />
                <Text style={{ marginLeft: 5, color: GOLD, fontSize: 13, fontWeight: "800" }}>+{improvement.gain}</Text>
              </View>
            ) : <Text className="text-sm text-muted">{Math.round(progress)} %</Text>}
          </View>
          <View className="mt-4 h-1.5 overflow-hidden bg-background">
            <View className="h-full bg-foreground" style={{ width: `${progress}%` }} />
            <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: "none", backgroundColor: GOLD }, goldStyle]} />
          </View>
        </View>

        <View className="mt-4 rounded-md bg-surface/80 p-5" style={{ borderWidth: 1, borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ZaymaxWatermark />
              <View className="ml-3">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-muted">PAUSENTIMER</Text>
                <Text className="mt-2 text-4xl font-bold text-foreground">{timerText}</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <Pressable accessibilityLabel={timerRunning ? "Timer pausieren" : "Timer starten"} onPress={timerRunning ? () => setTimerRunning(false) : startRest} style={({ pressed }) => [{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 4, backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}>
                <IconSymbol name={timerRunning ? "pause.fill" : "play.fill"} size={21} color={colors.background} />
              </Pressable>
              <Pressable accessibilityLabel="Timer zurücksetzen" onPress={resetRest} style={({ pressed }) => [{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 4, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}>
                <IconSymbol name="arrow.counterclockwise" size={20} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        </View>

        <Text className="mt-8 text-xl font-bold text-foreground">Deine Sätze</Text>
        <Text className="mt-1 text-sm text-muted">Passe Satzanzahl, Wiederholungen und Gewicht direkt an.</Text>

        {workout.exercises.map((exercise) => {
          const values = session.setValues[exercise.id] ?? [];
          const checkedSets = session.completedSets[exercise.id] ?? [];
          return (
            <View key={exercise.id} className="mt-3 rounded-md bg-surface/80 p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-bold text-foreground">{exercise.name}</Text>
                  <Text className="mt-1 text-sm text-muted">{checkedSets.filter(Boolean).length}/{values.length} geschafft</Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable accessibilityLabel="Satz entfernen" onPress={() => removeSet(exercise.id)} disabled={values.length <= 1} style={({ pressed }) => [{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 3, borderWidth: 1, borderColor: colors.border, opacity: values.length <= 1 ? 0.3 : pressed ? 0.55 : 1 }]}>
                    <IconSymbol name="minus" size={20} color={colors.foreground} />
                  </Pressable>
                  <Pressable accessibilityLabel="Satz hinzufügen" onPress={() => addSet(exercise.id)} disabled={values.length >= 20} style={({ pressed }) => [{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 3, borderWidth: 1, borderColor: colors.foreground, opacity: values.length >= 20 ? 0.3 : pressed ? 0.55 : 1 }]}>
                    <IconSymbol name="plus" size={20} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>

              <View className="mt-4 gap-2">
                {values.map((value, setIndex) => {
                  const checked = checkedSets[setIndex] ?? false;
                  const baseline = session.baselineSetValues[exercise.id]?.[setIndex]?.reps ?? value.reps;
                  const gain = Math.max(0, value.reps - baseline);
                  const displayWeight = value.weightKg === null ? 0 : weightUnit === "lbs" ? value.weightKg * 2.20462 : value.weightKg;
                  return (
                    <View key={setIndex} style={{ borderRadius: 4, borderWidth: 1, borderColor: checked ? colors.foreground : colors.border, backgroundColor: colors.background, padding: 12 }}>
                      <View className="flex-row items-center">
                        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`Satz ${setIndex + 1} abhaken`} onPress={() => toggleSet(exercise.id, setIndex)} style={({ pressed }) => [{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 3, borderWidth: 1, borderColor: checked ? colors.foreground : colors.muted, backgroundColor: checked ? colors.foreground : "transparent", opacity: pressed ? 0.65 : 1 }]}>
                          {checked ? <Text style={{ color: colors.background, fontWeight: "900" }}>✓</Text> : null}
                        </Pressable>
                        <Text style={{ marginLeft: 11, flex: 1, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, color: colors.muted }}>SATZ {String(setIndex + 1).padStart(2, "0")}</Text>
                        {gain > 0 ? (
                          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: `${GOLD}99`, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 4 }}>
                            <IconSymbol name="medal.fill" size={15} color={GOLD} />
                            <Text style={{ marginLeft: 4, color: GOLD, fontSize: 12, fontWeight: "800" }}>+{gain}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View className="mt-3 flex-row gap-2">
                        <NumberField
                          label="Wiederholungen"
                          value={value.reps}
                          integer
                          colors={colors}
                          onChange={(nextValue) => changeReps(exercise.id, setIndex, nextValue)}
                        />
                        <NumberField
                          label={`Gewicht (${weightUnit})`}
                          value={displayWeight}
                          colors={colors}
                          onChange={(nextValue) => changeWeight(exercise.id, setIndex, nextValue)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>

              <Pressable onPress={startRest} style={({ pressed }) => [{ marginTop: 13, alignSelf: "flex-start", opacity: pressed ? 0.55 : 1 }]}>
                <Text className="text-sm font-semibold text-muted">Pause starten</Text>
              </Pressable>
            </View>
          );
        })}

        <Pressable onPress={finish} style={({ pressed }) => [{ marginTop: 20, borderRadius: 4, backgroundColor: colors.primary, paddingVertical: 16, opacity: pressed ? 0.8 : 1 }]}>
          <Text className="text-center font-bold text-background">Workout beenden</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={effortPromptVisible} transparent animationType="fade" onRequestClose={() => !finishing && setEffortPromptVisible(false)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(0,0,0,0.82)" }}>
          <View style={{ borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20 }}>
            <Text className="text-xs font-bold uppercase tracking-[2px] text-muted">TRAINING ABGESCHLOSSEN</Text>
            <Text className="mt-2 text-3xl font-bold text-foreground">Wie war’s?</Text>
            <Text className="mt-2 text-sm leading-5 text-muted">Deine Antwort wird in der Historie gespeichert.</Text>
            <View className="mt-5 gap-2">
              {EFFORT_OPTIONS.map((option) => (
                <Pressable key={option.value} disabled={finishing} onPress={() => void completeWorkout(option.value)} style={({ pressed }) => [{ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 15, opacity: finishing ? 0.45 : pressed ? 0.65 : 1 }]}>
                  <Text className="font-bold text-foreground">{option.label}</Text>
                  <Text className="text-sm text-muted">{option.detail}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable disabled={finishing} onPress={() => setEffortPromptVisible(false)} style={({ pressed }) => [{ marginTop: 14, paddingVertical: 11, opacity: finishing ? 0.35 : pressed ? 0.55 : 1 }]}>
              <Text className="text-center text-sm font-semibold text-muted">{finishing ? "Wird gespeichert …" : "Zurück zum Training"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function NumberField({
  label,
  value,
  integer = false,
  colors,
  onChange,
}: {
  label: string;
  value: number;
  integer?: boolean;
  colors: any;
  onChange: (value: number) => void;
}) {
  const formattedValue = integer ? String(Math.round(value)) : value > 0 ? String(Number(value.toFixed(1))) : "";
  const [draft, setDraft] = useState(formattedValue);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formattedValue);
  }, [focused, formattedValue]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ marginBottom: 6, fontSize: 11, fontWeight: "700", color: colors.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={draft}
        selectTextOnFocus
        maxLength={integer ? 3 : 6}
        keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setDraft(formattedValue); }}
        onChangeText={(text) => {
          const normalized = text.replace(",", ".").replace(integer ? /\D/g : /[^0-9.]/g, "");
          setDraft(normalized);
          const parsed = Number(normalized);
          if (normalized !== "" && Number.isFinite(parsed)) onChange(parsed);
          if (normalized === "" && !integer) onChange(0);
        }}
        style={{ height: 46, borderRadius: 3, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, color: colors.foreground, fontSize: 17, fontWeight: "800" }}
      />
    </View>
  );
}
