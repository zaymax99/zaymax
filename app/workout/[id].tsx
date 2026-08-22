import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, Layout, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { emptyExercise, loadSettings, loadWorkouts, resizeRepsPerSet, resizeWeightsPerSet, saveWorkouts, toKg, uid, type Exercise, type WeightUnit, type Workout } from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";

export default function WorkoutEditorScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const [title, setTitle] = useState("Mein Workout");
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [loaded, setLoaded] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);

  useEffect(() => { (async () => { const settings = await loadSettings(); setWeightUnit(settings.weightUnit); if (!isNew && id) { const existing = (await loadWorkouts()).find((item) => item.id === id); if (existing) { setTitle(existing.title); setExercises(existing.exercises); } } setLoaded(true); })(); }, [id, isNew]);
  function updateExercise(exerciseId: string, patch: Partial<Exercise>) { setExercises((current) => current.map((item) => item.id === exerciseId ? { ...item, ...patch } : item)); }
  function removeExercise(exerciseId: string) { setExercises((current) => current.length > 1 ? current.filter((item) => item.id !== exerciseId) : current); }
  function reorder(from: number, insertionIndex: number) { setExercises((current) => { const next = [...current]; const [moved] = next.splice(from, 1); const adjusted = insertionIndex > from ? insertionIndex - 1 : insertionIndex; next.splice(Math.max(0, Math.min(next.length, adjusted)), 0, moved); return next; }); }
  async function save(completed = false) {
    const valid = exercises.filter((item) => item.name.trim());
    if (!title.trim() || !valid.length) {
      Alert.alert("Workout noch leer", "Gib deinem Workout einen Namen und füge mindestens eine Übung hinzu.");
      return;
    }
    if (valid.some((item) => item.sets < 1 || resizeRepsPerSet(item, item.sets).some((reps) => reps < 1))) {
      Alert.alert("Sätze prüfen", "Trage für jeden Satz mindestens eine Wiederholung ein.");
      return;
    }
    const now = new Date().toISOString();
    const all = await loadWorkouts();
    const existing = all.find((item) => item.id === id);
    const next: Workout = {
      id: isNew ? uid() : id!,
      title: title.trim(),
      exercises: valid.map((exercise) => ({ ...exercise, repsPerSet: resizeRepsPerSet(exercise, exercise.sets), weightsPerSetKg: resizeWeightsPerSet(exercise, exercise.sets) })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: completed ? now : existing?.completedAt,
      archivedAt: existing?.archivedAt,
    };
    await saveWorkouts(isNew ? [next, ...all] : all.map((item) => item.id === next.id ? next : item));
    router.replace("/");
  }
  if (!loaded) return <ScreenContainer className="items-center justify-center"><Text className="text-muted">Workout wird geladen …</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" containerClassName="bg-background"><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}><View className="flex-row items-center pt-3 pb-6"><ZaymaxWatermark /><Pressable onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}><IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} /></Pressable><View><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">WORKOUT BUILDER</Text><Text className="mt-1 text-3xl font-bold text-foreground">{isNew ? "Neues Workout" : "Workout bearbeiten"}</Text></View></View><Animated.View entering={FadeIn.duration(300)} className="rounded-md bg-surface/80 p-5" style={{ borderWidth: 1, borderColor: colors.border }}><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">Name</Text><TextInput value={title} onChangeText={setTitle} placeholder="z. B. Push Day" placeholderTextColor={colors.muted} style={{ marginTop: 10, color: colors.foreground, fontSize: 24, fontWeight: "700" }} /></Animated.View><View className="mt-5 flex-row items-center justify-between"><View><Text className="text-xl font-bold text-foreground">Übungen</Text><Text className="mt-1 text-sm text-muted">Gedrückt halten und verschieben</Text></View><Text className="text-sm text-muted">{exercises.length} Übungen</Text></View>{exercises.map((exercise, index) => <View key={exercise.id}>{draggingIndex !== null && placeholderIndex === index && draggingIndex !== index && <DropPlaceholder colors={colors} />}<ExerciseCard exercise={exercise} index={index} total={exercises.length} colors={colors} unit={weightUnit} dragging={draggingIndex === index} onChange={(patch) => updateExercise(exercise.id, patch)} onRemove={() => removeExercise(exercise.id)} onDragStart={() => { setDraggingIndex(index); setPlaceholderIndex(index); }} onDragMove={(target) => setPlaceholderIndex(target)} onDragEnd={(target) => { reorder(index, target); setDraggingIndex(null); setPlaceholderIndex(null); }} /></View>)}{draggingIndex !== null && placeholderIndex === exercises.length && <DropPlaceholder colors={colors} />}<Pressable onPress={() => setExercises((current) => [...current, emptyExercise()])} style={({ pressed }) => [{ marginTop: 14, borderRadius: 4, borderWidth: 1, borderColor: colors.border, paddingVertical: 15, opacity: pressed ? 0.65 : 1 }]}><Text className="text-center font-bold text-foreground">+ Übung hinzufügen</Text></Pressable><Pressable onPress={() => save(false)} style={({ pressed }) => [{ marginTop: 20, borderRadius: 4, backgroundColor: colors.primary, paddingVertical: 16, opacity: pressed ? 0.8 : 1 }]}><Text className="text-center font-bold text-background">Workout speichern</Text></Pressable><Pressable onPress={() => save(true)} style={({ pressed }) => [{ marginTop: 10, borderRadius: 4, backgroundColor: `${colors.surface}CC`, borderWidth: 1, borderColor: colors.border, paddingVertical: 15, opacity: pressed ? 0.65 : 1 }]}><Text className="text-center font-bold text-foreground">Als abgeschlossen markieren</Text></Pressable></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}

function DropPlaceholder({ colors }: { colors: any }) { return <Animated.View entering={FadeIn.duration(140)} exiting={FadeIn.duration(120)} style={{ marginTop: 12, height: 68, borderRadius: 4, borderWidth: 1, borderStyle: "dashed", borderColor: colors.muted, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">HIER ABLEGEN</Text></Animated.View>; }

function ExerciseCard({ exercise, index, total, colors, unit, dragging, onChange, onRemove, onDragStart, onDragMove, onDragEnd }: { exercise: Exercise; index: number; total: number; colors: any; unit: WeightUnit; dragging: boolean; onChange: (patch: Partial<Exercise>) => void; onRemove: () => void; onDragStart: () => void; onDragMove: (target: number) => void; onDragEnd: (target: number) => void }) {
  const translateY = useSharedValue(0);
  const lastSlot = useRef(index);
  function beginDrag() { lastSlot.current = index; if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDragStart(); }
  function moveDrag(target: number) { if (target !== lastSlot.current && Platform.OS !== "web") { void Haptics.selectionAsync(); lastSlot.current = target; } onDragMove(target); }
  function endDrag(target: number) { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDragEnd(target); }
  const gesture = Gesture.Pan().activateAfterLongPress(180).onStart(() => { runOnJS(beginDrag)(); }).onUpdate((event) => { translateY.value = event.translationY; const shift = event.translationY > 0 ? Math.ceil(event.translationY / 120) : Math.floor(event.translationY / 120); runOnJS(moveDrag)(Math.max(0, Math.min(total, index + shift + (shift > 0 ? 1 : 0)))); }).onEnd((event) => { const shift = event.translationY > 0 ? Math.ceil(event.translationY / 120) : Math.floor(event.translationY / 120); runOnJS(endDrag)(Math.max(0, Math.min(total, index + shift + (shift > 0 ? 1 : 0)))); translateY.value = withSpring(0); });
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }], zIndex: translateY.value ? 10 : 0, opacity: dragging ? 0.82 : 1 }));
  return <GestureDetector gesture={gesture}><Animated.View entering={FadeInDown.delay(index * 55).duration(300)} layout={Layout.duration(220)} className="mt-3 rounded-md bg-surface/80 p-4" style={[animatedStyle, { borderWidth: 1, borderColor: colors.border }]}><View className="flex-row items-center justify-between"><View className="flex-row items-center"><IconSymbol name="line.3.horizontal" size={20} color={colors.muted} /><Text className="ml-2 text-xs font-bold uppercase tracking-[2px] text-muted">Übung {index + 1}</Text></View>{total > 1 && <Pressable onPress={onRemove} style={{ padding: 6 }}><IconSymbol name="trash.fill" size={19} color={colors.muted} /></Pressable>}</View><TextInput value={exercise.name} onChangeText={(value) => onChange({ name: value })} placeholder="Übungsname, z. B. Bankdrücken" placeholderTextColor={colors.muted} style={{ marginTop: 12, borderColor: colors.border, borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 13, color: colors.foreground, backgroundColor: colors.background, fontSize: 15, fontWeight: "600" }} /><View className="mt-3 w-28"><NumberField label="Sätze" value={exercise.sets} onChange={(value) => { const sets = Math.min(20, Math.floor(value)); const repsPerSet = resizeRepsPerSet(exercise, sets); const weightsPerSetKg = resizeWeightsPerSet(exercise, sets); onChange({ sets, reps: repsPerSet[0] ?? 0, repsPerSet, weightKg: weightsPerSetKg[0] ?? undefined, weightsPerSetKg }); }} colors={colors} /></View><Text className="mt-5 text-xs font-bold uppercase tracking-[1px] text-muted">Werte pro Satz</Text><View className="mt-2 gap-2">{resizeRepsPerSet(exercise, exercise.sets).map((reps, setIndex) => <SetDetailRow key={setIndex} setNumber={setIndex + 1} reps={reps} weightKg={resizeWeightsPerSet(exercise, exercise.sets)[setIndex]} unit={unit} colors={colors} onRepsChange={(value) => { const repsPerSet = resizeRepsPerSet(exercise, exercise.sets); repsPerSet[setIndex] = value; onChange({ reps: repsPerSet[0] ?? 0, repsPerSet }); }} onWeightChange={(value) => { const weightsPerSetKg = resizeWeightsPerSet(exercise, exercise.sets); weightsPerSetKg[setIndex] = value ? toKg(value, unit) : null; onChange({ weightKg: weightsPerSetKg[0] ?? undefined, weightsPerSetKg }); }} />)}</View></Animated.View></GestureDetector>;
}
function NumberField({ label, value, onChange, colors }: { label: string; value: number; onChange: (value: number) => void; colors: any }) { return <View className="flex-1"><Text className="mb-2 text-xs font-bold uppercase tracking-[1px] text-muted">{label}</Text><TextInput value={value ? String(value) : ""} onChangeText={(text) => onChange(Number(text.replace(/[^0-9.]/g, "")) || 0)} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.muted} style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 4, paddingVertical: 12, textAlign: "center", color: colors.foreground, backgroundColor: colors.background, fontWeight: "700" }} /></View>; }
function SetDetailRow({ setNumber, reps, weightKg, unit, onRepsChange, onWeightChange, colors }: { setNumber: number; reps: number; weightKg: number | null | undefined; unit: WeightUnit; onRepsChange: (value: number) => void; onWeightChange: (value: number) => void; colors: any }) { const shownWeight = weightKg ? Number((unit === "lbs" ? weightKg * 2.20462 : weightKg).toFixed(1)) : 0; return <View className="border border-border bg-background p-3"><Text className="text-xs font-bold uppercase tracking-[1px] text-muted">Satz {String(setNumber).padStart(2, "0")}</Text><View className="mt-2 flex-row gap-2"><View className="flex-1"><Text className="mb-1 text-[10px] font-bold uppercase tracking-[1px] text-muted">Wdh.</Text><TextInput value={reps ? String(reps) : ""} onChangeText={(text) => onRepsChange(Number(text.replace(/[^0-9]/g, "")) || 0)} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.muted} style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 3, paddingVertical: 11, textAlign: "center", color: colors.foreground, backgroundColor: colors.surface, fontWeight: "700" }} /></View><View className="flex-1"><Text className="mb-1 text-[10px] font-bold uppercase tracking-[1px] text-muted">{unit} · optional</Text><TextInput value={shownWeight ? String(shownWeight) : ""} onChangeText={(text) => onWeightChange(Number(text.replace(/[^0-9.]/g, "")) || 0)} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.muted} style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 3, paddingVertical: 11, textAlign: "center", color: colors.foreground, backgroundColor: colors.surface, fontWeight: "700" }} /></View></View></View>; }
