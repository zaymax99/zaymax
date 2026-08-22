import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeInDown, Layout, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { exerciseSummary, formatDate, loadWorkouts, saveWorkouts, type Workout } from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";

export default function HistoryScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [undoWorkout, setUndoWorkout] = useState<Workout | null>(null);
  const refresh = useCallback(async () => setWorkouts((await loadWorkouts()).filter((item) => item.archivedAt)), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { if (!undoWorkout) return; const timeout = setTimeout(() => setUndoWorkout(null), 4500); return () => clearTimeout(timeout); }, [undoWorkout]);

  async function deleteWorkout(workout: Workout) { const all = await loadWorkouts(); await saveWorkouts(all.filter((item) => item.id !== workout.id)); setWorkouts((current) => current.filter((item) => item.id !== workout.id)); setUndoWorkout(workout); }
  async function restoreWorkout() { if (!undoWorkout) return; const all = await loadWorkouts(); await saveWorkouts([undoWorkout, ...all]); setWorkouts((current) => [undoWorkout, ...current]); setUndoWorkout(null); }
  function confirmDelete(workout: Workout) { Alert.alert("Workout löschen?", "Du kannst die Löschung kurz rückgängig machen.", [{ text: "Abbrechen", style: "cancel" }, { text: "Löschen", style: "destructive", onPress: () => deleteWorkout(workout) }]); }

  return <ScreenContainer className="px-5" containerClassName="bg-background"><View className="flex-row items-start pt-3 pb-6"><ZaymaxWatermark /><View className="ml-3 flex-1"><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">MANUELL ARCHIVIERT</Text><Text className="mt-1 text-3xl font-bold text-foreground">Archiv</Text><Text className="mt-2 text-base text-muted">Workouts, die du bewusst abgelegt hast.</Text></View></View><FlatList data={workouts} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: undoWorkout ? 100 : 30, flexGrow: workouts.length ? 0 : 1 }} ListEmptyComponent={<Animated.View entering={FadeIn.duration(350)} className="flex-1 items-center justify-center rounded-md bg-surface/80 p-7" style={{ borderWidth: 1, borderColor: colors.border }}><View className="h-14 w-14 items-center justify-center rounded-sm border border-border bg-background"><IconSymbol name="archivebox.fill" size={26} color={colors.foreground} /></View><Text className="mt-4 text-center text-lg font-bold text-foreground">Archiv ist leer</Text><Text className="mt-2 text-center leading-5 text-muted">Archiviere Workouts auf Home, um sie hier gesammelt einsehen oder löschen zu können.</Text></Animated.View>} renderItem={({ item, index }) => <SwipeWorkoutRow key={item.id} workout={item} index={index} colors={colors} onOpen={() => router.push({ pathname: "/workout/[id]", params: { id: item.id } })} onDelete={() => confirmDelete(item)} />} />{undoWorkout && <Animated.View entering={FadeInDown.duration(220)} style={{ position: "absolute", bottom: 18, left: 20, right: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14 }}><Text className="text-sm text-foreground">Workout gelöscht</Text><Pressable onPress={restoreWorkout} style={{ paddingHorizontal: 10, paddingVertical: 6 }}><Text className="font-bold text-foreground">Rückgängig</Text></Pressable></Animated.View>}</ScreenContainer>;
}

function SwipeWorkoutRow({ workout, index, colors, onOpen, onDelete }: { workout: Workout; index: number; colors: any; onOpen: () => void; onDelete: () => void }) {
  const translateX = useSharedValue(0);
  const pan = Gesture.Pan().activeOffsetX([-12, 12]).failOffsetY([-10, 10]).onUpdate((event) => { translateX.value = Math.min(0, Math.max(-110, event.translationX)); }).onEnd(() => { if (translateX.value < -72) { translateX.value = withSpring(-96); runOnJS(onDelete)(); } else translateX.value = withSpring(0); });
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  return <Animated.View entering={FadeInDown.delay(index * 70).duration(320)} layout={Layout.duration(250)} style={{ marginBottom: 12, position: "relative", overflow: "hidden", borderRadius: 4, backgroundColor: colors.background }}><View style={{ position: "absolute", inset: 0, alignItems: "flex-end", justifyContent: "center", paddingRight: 22 }}><IconSymbol name="trash.fill" size={22} color={colors.background} /></View><GestureDetector gesture={pan}><Animated.View style={rowStyle}><View className="flex-row items-center rounded-sm bg-surface/60 p-4" style={{ borderWidth: 1, borderColor: colors.border }}><Pressable onPress={onOpen} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", opacity: pressed ? 0.65 : 1 }]}><View className="mr-4 h-12 w-12 items-center justify-center rounded-sm border border-border bg-background"><IconSymbol name="archivebox.fill" size={23} color={colors.foreground} /></View><View className="flex-1"><Text className="font-bold text-foreground">{workout.title}</Text><Text className="mt-1 text-sm text-muted">{formatDate(workout.archivedAt!)} · {workout.exercises.length} Übungen</Text><Text numberOfLines={1} className="mt-1 text-sm text-muted">{exerciseSummary(workout.exercises[0])}</Text></View></Pressable><Pressable onPress={onDelete} style={({ pressed }) => [{ padding: 10, opacity: pressed ? 0.5 : 1 }]}><IconSymbol name="trash.fill" size={20} color={colors.error} /></Pressable></View></Animated.View></GestureDetector></Animated.View>;
}
