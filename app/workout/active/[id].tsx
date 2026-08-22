import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { clearActiveSession, displayWeight, loadActiveSession, loadSettings, loadWorkoutHistory, loadWorkouts, repsForSet, saveActiveSession, saveWorkoutHistory, saveWorkouts, uid, weightForSet, type ActiveSession, type WeightUnit, type Workout, type WorkoutHistoryEntry } from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";

const DEFAULT_REST = 90;

export default function ActiveWorkoutScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  useEffect(() => { (async () => { const found = (await loadWorkouts()).find((item) => item.id === id); if (!found) return; setWorkout(found); const existing = await loadActiveSession(); const settings = await loadSettings(); setWeightUnit(settings.weightUnit); const initial: ActiveSession = existing?.workoutId === id ? { ...existing, restSeconds: settings.restSeconds } : { workoutId: id!, completedSets: {}, restSeconds: settings.restSeconds || DEFAULT_REST, restRemaining: 0 }; found.exercises.forEach((exercise) => { const savedSets = initial.completedSets[exercise.id] ?? []; initial.completedSets[exercise.id] = Array.from({ length: exercise.sets }, (_, setIndex) => savedSets[setIndex] ?? false); }); setSession(initial); await saveActiveSession(initial); })(); }, [id]);

  const restRemaining = session?.restRemaining ?? 0;
  useEffect(() => { if (timerRunning && restRemaining === 0) { setTimerRunning(false); if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; } if (!timerRunning || !restRemaining) return; const interval = setInterval(() => { setSession((current) => current ? { ...current, restRemaining: Math.max(0, current.restRemaining - 1) } : current); }, 1000); return () => clearInterval(interval); }, [timerRunning, restRemaining]);
  useEffect(() => { if (session) saveActiveSession(session); }, [session]);

  const completedCount = useMemo(() => session ? Object.values(session.completedSets).flat().filter(Boolean).length : 0, [session]);
  const totalSets = useMemo(() => workout?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0, [workout]);
  const timerText = session ? `${String(Math.floor(session.restRemaining / 60)).padStart(2, "0")}:${String(session.restRemaining % 60).padStart(2, "0")}` : "01:30";

  function toggleSet(exerciseId: string, setIndex: number) { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSession((current) => { if (!current) return current; const next = { ...current.completedSets, [exerciseId]: [...(current.completedSets[exerciseId] ?? [])] }; next[exerciseId][setIndex] = !next[exerciseId][setIndex]; return { ...current, completedSets: next, restRemaining: next[exerciseId][setIndex] ? current.restSeconds : current.restRemaining }; }); }
  function startRest() { setSession((current) => current ? { ...current, restRemaining: current.restSeconds } : current); setTimerRunning(true); }
  function resetRest() { setTimerRunning(false); setSession((current) => current ? { ...current, restRemaining: 0 } : current); }
  async function finish() { if (!workout || !session) return; if (completedCount < totalSets) { Alert.alert("Workout noch nicht fertig", `Hake noch ${totalSets - completedCount} ${totalSets - completedCount === 1 ? "Satz" : "Sätze"} ab oder beende das Workout trotzdem.`, [{ text: "Weiter trainieren", style: "cancel" }, { text: "Trotzdem beenden", onPress: () => completeWorkout() }]); return; } await completeWorkout(); }
  async function completeWorkout() {
    if (!workout || !session) return;
    const completedAt = new Date().toISOString();
    const historyEntry: WorkoutHistoryEntry = {
      id: uid(),
      workoutId: workout.id,
      workoutTitle: workout.title,
      completedAt,
      exercises: workout.exercises.map((exercise) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        sets: Array.from({ length: exercise.sets }, (_, setIndex) => setIndex).flatMap((setIndex) =>
          session.completedSets[exercise.id]?.[setIndex]
            ? [{ setNumber: setIndex + 1, reps: repsForSet(exercise, setIndex), weightKg: weightForSet(exercise, setIndex) }]
            : [],
        ),
      })).filter((exercise) => exercise.sets.length > 0),
    };
    const [all, history] = await Promise.all([loadWorkouts(), loadWorkoutHistory()]);
    await Promise.all([
      saveWorkouts(all.map((item) => item.id === workout.id ? { ...item, completedAt, updatedAt: completedAt } : item)),
      saveWorkoutHistory([historyEntry, ...history]),
    ]);
    await clearActiveSession();
    router.replace("/");
  }

  if (!workout || !session) return <ScreenContainer className="items-center justify-center"><Text className="text-muted">Training wird geladen …</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 38 }}><View className="flex-row items-center pt-3 pb-6"><ZaymaxWatermark /><Pressable onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} /></Pressable><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">AKTIVES TRAINING</Text><Text className="mt-1 text-3xl font-bold text-foreground">{workout.title}</Text></View></View><Animated.View entering={FadeIn.duration(300)} className="rounded-md bg-surface/80 p-5" style={{ borderWidth: 1, borderColor: colors.border }}><View className="flex-row items-end justify-between"><View><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">SÄTZE</Text><Text className="mt-2 text-3xl font-bold text-foreground">{completedCount}<Text className="text-base font-medium text-muted"> / {totalSets}</Text></Text></View><Text className="text-sm text-muted">{Math.round((completedCount / Math.max(1, totalSets)) * 100)} %</Text></View><View className="mt-4 h-1.5 overflow-hidden bg-background"><View className="h-full bg-foreground" style={{ width: `${Math.min(100, (completedCount / Math.max(1, totalSets)) * 100)}%` }} /></View></Animated.View><Animated.View entering={FadeInDown.delay(80).duration(320)} className="mt-4 rounded-md bg-surface/80 p-5" style={{ borderWidth: 1, borderColor: colors.border }}><View className="flex-row items-center justify-between"><View className="flex-row items-center"><ZaymaxWatermark /><View className="ml-3"><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">PAUSENTIMER</Text><Text className="mt-2 text-4xl font-bold text-foreground">{timerText}</Text></View></View><View className="flex-row gap-2"><Pressable onPress={timerRunning ? () => setTimerRunning(false) : startRest} style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 4, backgroundColor: colors.primary }}><IconSymbol name={timerRunning ? "pause.fill" : "play.fill"} size={21} color={colors.background} /></Pressable><Pressable onPress={resetRest} style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 4, borderWidth: 1, borderColor: colors.border }}><IconSymbol name="arrow.counterclockwise" size={20} color={colors.foreground} /></Pressable></View></View><Text className="mt-3 text-sm text-muted">Tippe nach jedem Satz auf Start, um deine Pause zu beginnen.</Text></Animated.View><Text className="mt-8 text-xl font-bold text-foreground">Deine Sätze</Text>{workout.exercises.map((exercise, index) => <Animated.View key={exercise.id} entering={FadeInDown.delay(130 + index * 55).duration(320)} layout={Layout.duration(220)} className="mt-3 rounded-md bg-surface/80 p-4" style={{ borderWidth: 1, borderColor: colors.border }}><View className="flex-row items-center justify-between"><View><Text className="font-bold text-foreground">{exercise.name}</Text><Text className="mt-1 text-sm text-muted">Wiederholungen und Gewicht pro Satz</Text></View><Text className="text-sm text-muted">{(session.completedSets[exercise.id] ?? []).filter(Boolean).length}/{exercise.sets}</Text></View><View className="mt-4 gap-2">{Array.from({ length: exercise.sets }, (_, setIndex) => { const checked = session.completedSets[exercise.id]?.[setIndex]; const setWeight = weightForSet(exercise, setIndex); return <Pressable key={setIndex} onPress={() => toggleSet(exercise.id, setIndex)} style={{ minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 4, borderWidth: 1, borderColor: checked ? colors.foreground : colors.border, backgroundColor: checked ? colors.foreground : colors.background, paddingHorizontal: 14 }}><View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center", borderRadius: 2, borderWidth: 1, borderColor: checked ? colors.background : colors.muted, backgroundColor: checked ? colors.background : "transparent" }}>{checked ? <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: "900" }}>✓</Text> : null}</View><Text style={{ marginLeft: 12, flex: 1, fontSize: 12, fontWeight: "700", color: checked ? colors.background : colors.muted }}>SATZ {String(setIndex + 1).padStart(2, "0")}</Text><Text style={{ fontSize: 13, fontWeight: "700", color: checked ? colors.background : colors.foreground }}>{repsForSet(exercise, setIndex)} Wdh. · {setWeight ? displayWeight(setWeight, weightUnit) : "ohne Gewicht"}</Text></Pressable>; })}</View><Pressable onPress={startRest} style={{ marginTop: 12, alignSelf: "flex-start" }}><Text className="text-sm font-semibold text-muted">Pause starten</Text></Pressable></Animated.View>)}<Pressable onPress={finish} style={({ pressed }) => [{ marginTop: 20, borderRadius: 4, backgroundColor: colors.primary, paddingVertical: 16, opacity: pressed ? 0.8 : 1 }]}><Text className="text-center font-bold text-background">Workout beenden</Text></Pressable></ScrollView></ScreenContainer>;
}
