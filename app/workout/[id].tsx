import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import {
  emptyExercise,
  loadSettings,
  loadWorkouts,
  resizeRepsPerSet,
  resizeWeightsPerSet,
  saveWorkouts,
  toKg,
  uid,
  type Exercise,
  type WeightUnit,
  type Workout,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";
import {
  hapticAction,
  hapticSelection,
  hapticSuccess,
  hapticTap,
} from "@/lib/haptics";
import { useLanguage, usesDecimalComma, type AppLanguage } from "@/lib/i18n";

export default function WorkoutEditorScreen() {
  const colors = useColors("dark");
  const { language, t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const [title, setTitle] = useState(t("Mein Workout", "My Workout"));
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [loaded, setLoaded] = useState(false);
  const [loadIssue, setLoadIssue] = useState<"missing" | "failed" | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null);

  useEffect(() => {
    if (
      isNew &&
      (title === "Mein Workout" ||
        title === "My Workout" ||
        title === "Mój trening")
    ) {
      setTitle(t("Mein Workout", "My Workout"));
    }
  }, [isNew, language, t, title]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const settings = await loadSettings();
        if (!mounted) return;
        setWeightUnit(settings.weightUnit);
        if (!isNew && id) {
          const existing = (await loadWorkouts()).find(
            (item) => item.id === id,
          );
          if (!mounted) return;
          if (!existing) {
            setLoadIssue("missing");
            return;
          }
          setTitle(existing.title);
          setExercises(existing.exercises);
        }
      } catch {
        if (mounted) setLoadIssue("failed");
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, isNew]);
  function updateExercise(exerciseId: string, patch: Partial<Exercise>) {
    setExercises((current) =>
      current.map((item) =>
        item.id === exerciseId ? { ...item, ...patch } : item,
      ),
    );
  }
  function removeExercise(exerciseId: string) {
    setExercises((current) =>
      current.length > 1
        ? current.filter((item) => item.id !== exerciseId)
        : current,
    );
  }
  function reorder(from: number, insertionIndex: number) {
    setExercises((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      const adjusted =
        insertionIndex > from ? insertionIndex - 1 : insertionIndex;
      next.splice(Math.max(0, Math.min(next.length, adjusted)), 0, moved);
      return next;
    });
  }
  function moveExercise(from: number, to: number) {
    if (from === to || to < 0 || to >= exercises.length) return;
    setExercises((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }
  async function save(completed = false) {
    if (savingRef.current || loadIssue) return;
    const valid = exercises.filter((item) => item.name.trim());
    if (!title.trim() || !valid.length) {
      Alert.alert(
        t("Workout noch leer", "Workout is still empty"),
        t(
          "Gib deinem Workout einen Namen und füge mindestens eine Übung hinzu.",
          "Name your workout and add at least one exercise.",
        ),
      );
      return;
    }
    if (
      valid.some(
        (item) =>
          item.sets < 1 ||
          resizeRepsPerSet(item, item.sets).some((reps) => reps < 1),
      )
    ) {
      Alert.alert(
        t("Sätze prüfen", "Check your sets"),
        t(
          "Trage für jeden Satz mindestens eine Wiederholung ein.",
          "Enter at least one repetition for every set.",
        ),
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const all = await loadWorkouts();
      const existing = all.find((item) => item.id === id);
      if (!isNew && !existing) {
        setLoadIssue("missing");
        return;
      }
      const next: Workout = {
        id: isNew ? uid() : id!,
        title: title.trim(),
        exercises: valid.map((exercise) => ({
          ...exercise,
          repsPerSet: resizeRepsPerSet(exercise, exercise.sets),
          weightsPerSetKg: resizeWeightsPerSet(exercise, exercise.sets),
        })),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        completedAt: completed ? now : existing?.completedAt,
        lockedAt: existing?.lockedAt,
      };
      await saveWorkouts(
        isNew
          ? [next, ...all]
          : all.map((item) => (item.id === next.id ? next : item)),
      );
      hapticSuccess();
      router.replace("/");
    } catch {
      Alert.alert(
        t(
          "Workout konnte nicht gespeichert werden",
          "Workout could not be saved",
          "Nie udało się zapisać treningu",
        ),
        t(
          "Bitte versuche es erneut. Deine Eingaben bleiben geöffnet.",
          "Please try again. Your entries will stay open.",
          "Spróbuj ponownie. Wprowadzone dane pozostaną otwarte.",
        ),
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  if (!loaded)
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">
          {t("Workout wird geladen …", "Loading workout …")}
        </Text>
      </ScreenContainer>
    );
  if (loadIssue)
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
                "Workout konnte nicht geladen werden",
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
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="flex-row items-center pt-3 pb-6">
            <ZaymaxWatermark />
            <Pressable
              accessibilityLabel={t("Zurück", "Back")}
              onPress={() => {
                hapticTap();
                router.back();
              }}
              style={{
                padding: 8,
                marginRight: 8,
                borderRadius: ZAYMAX_DESIGN.radius.round,
              }}
            >
              <IconSymbol
                name="chevron.right"
                size={22}
                color={colors.foreground}
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            </Pressable>
            <View>
              <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                {t("WORKOUT-EDITOR", "WORKOUT BUILDER")}
              </Text>
              <Text className="mt-1 text-3xl font-black text-foreground">
                {isNew
                  ? t("Neues Workout", "New workout")
                  : t("Workout bearbeiten", "Edit workout")}
              </Text>
            </View>
          </View>
          <Animated.View
            entering={FadeIn.duration(300)}
            className="bg-surface p-5"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: ZAYMAX_DESIGN.radius.card,
            }}
          >
            <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
              {t("Name", "Name")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("z. B. Push Day", "e.g. Push Day")}
              placeholderTextColor={colors.muted}
              style={{
                marginTop: 10,
                color: colors.foreground,
                fontSize: 24,
                fontWeight: "800",
              }}
            />
          </Animated.View>
          <View className="mt-5 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-black text-foreground">
                {t("Übungen", "Exercises")}
              </Text>
              <Text className="mt-1 text-sm text-muted">
                {t(
                  "Am Griff ziehen oder Pfeile verwenden",
                  "Drag the handle or use the arrows",
                  "Przeciągnij uchwyt lub użyj strzałek",
                )}
              </Text>
            </View>
            <Text className="text-sm text-muted">
              {exercises.length}{" "}
              {exercises.length === 1
                ? t("Übung", "exercise")
                : t("Übungen", "exercises")}
            </Text>
          </View>
          {exercises.map((exercise, index) => (
            <View key={exercise.id}>
              {draggingIndex !== null &&
                placeholderIndex === index &&
                draggingIndex !== index && <DropPlaceholder colors={colors} />}
              <ExerciseCard
                exercise={exercise}
                index={index}
                total={exercises.length}
                colors={colors}
                unit={weightUnit}
                dragging={draggingIndex === index}
                onChange={(patch) => updateExercise(exercise.id, patch)}
                onRemove={() => removeExercise(exercise.id)}
                onMoveUp={() => moveExercise(index, index - 1)}
                onMoveDown={() => moveExercise(index, index + 1)}
                onDragStart={() => {
                  setDraggingIndex(index);
                  setPlaceholderIndex(index);
                }}
                onDragMove={(target) => setPlaceholderIndex(target)}
                onDragEnd={(target) => {
                  reorder(index, target);
                  setDraggingIndex(null);
                  setPlaceholderIndex(null);
                }}
              />
            </View>
          ))}
          {draggingIndex !== null && placeholderIndex === exercises.length && (
            <DropPlaceholder colors={colors} />
          )}
          <Pressable
            onPress={() => {
              hapticTap();
              setExercises((current) => [...current, emptyExercise()]);
            }}
            style={({ pressed }) => [
              {
                marginTop: 14,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 15,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Text className="text-center font-black tracking-[0.4px] text-foreground">
              + {t("Übung hinzufügen", "Add exercise")}
            </Text>
          </Pressable>
          <Pressable
            disabled={saving}
            onPress={() => void save(false)}
            style={({ pressed }) => [
              {
                marginTop: 20,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                backgroundColor: colors.primary,
                paddingVertical: 16,
                opacity: saving ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text className="text-center font-black tracking-[0.4px] text-background">
              {saving
                ? t("Wird gespeichert …", "Saving …")
                : t("Workout speichern", "Save workout")}
            </Text>
          </Pressable>
          <Pressable
            disabled={saving}
            onPress={() => void save(true)}
            style={({ pressed }) => [
              {
                marginTop: 10,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                backgroundColor: `${colors.surface}CC`,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 15,
                opacity: saving ? 0.5 : pressed ? 0.65 : 1,
              },
            ]}
          >
            <Text className="text-center font-black tracking-[0.4px] text-foreground">
              {t("Als abgeschlossen markieren", "Mark as completed")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function DropPlaceholder({ colors }: { colors: any }) {
  const { t } = useLanguage();
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(120)}
      style={{
        marginTop: 12,
        height: 54,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: `${colors.primary}90`,
        backgroundColor: ZAYMAX_DESIGN.colors.goldSoft,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: ZAYMAX_DESIGN.radius.nested,
      }}
    >
      <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
        {t("HIER ABLEGEN", "DROP HERE")}
      </Text>
    </Animated.View>
  );
}

function ExerciseCard({
  exercise,
  index,
  total,
  colors,
  unit,
  dragging,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  colors: any;
  unit: WeightUnit;
  dragging: boolean;
  onChange: (patch: Partial<Exercise>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragMove: (target: number) => void;
  onDragEnd: (target: number) => void;
}) {
  const { t } = useLanguage();
  const translateY = useSharedValue(0);
  const dragTarget = useSharedValue(index);
  const dragActive = useSharedValue(false);
  const lastSlot = useRef(index);
  function beginDrag() {
    lastSlot.current = index;
    dragTarget.value = index;
    hapticTap();
    onDragStart();
  }
  function moveDrag(target: number) {
    if (target !== lastSlot.current) {
      hapticSelection();
      lastSlot.current = target;
    }
    onDragMove(target);
  }
  function endDrag(target: number, committed: boolean) {
    if (committed) hapticAction();
    onDragEnd(target);
  }
  const gesture = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      dragActive.value = true;
      runOnJS(beginDrag)();
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
      const shift = Math.trunc(event.translationY / 96);
      const target = Math.max(
        0,
        Math.min(total, index + shift + (shift > 0 ? 1 : 0)),
      );
      if (target !== dragTarget.value) {
        dragTarget.value = target;
        runOnJS(moveDrag)(target);
      }
    })
    .onFinalize((_event, success) => {
      if (dragActive.value) {
        runOnJS(endDrag)(success ? dragTarget.value : index, success);
        dragActive.value = false;
      }
      translateY.value = withSpring(0, { damping: 18, stiffness: 190 });
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: dragging ? 1.015 : 1 },
    ],
    zIndex: dragging ? 20 : 0,
    opacity: dragging ? 0.94 : 1,
  }));
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 45).duration(240)}
      layout={Layout.springify().damping(18).stiffness(190)}
      className="mt-3 bg-surface p-3"
      style={[
        animatedStyle,
        {
          borderWidth: 1,
          borderColor: dragging ? colors.primary : colors.border,
          borderRadius: ZAYMAX_DESIGN.radius.card,
        },
      ]}
    >
      <View className="flex-row items-center justify-between">
        <GestureDetector gesture={gesture}>
          <View
            accessibilityLabel={t(
              `Übung ${index + 1} verschieben`,
              `Move exercise ${index + 1}`,
              `Przesuń ćwiczenie ${index + 1}`,
            )}
            style={{
              minHeight: 36,
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <IconSymbol
              name="line.3.horizontal"
              size={21}
              color={colors.primary}
            />
            <Text className="ml-2 text-xs font-black uppercase tracking-[1.6px] text-muted">
              {t("Übung", "Exercise")} {index + 1}
            </Text>
          </View>
        </GestureDetector>
        <View className="flex-row items-center gap-1">
          <ExerciseMoveButton
            direction="up"
            disabled={index === 0}
            label={t(
              "Übung nach oben verschieben",
              "Move exercise up",
              "Przesuń ćwiczenie w górę",
            )}
            onPress={onMoveUp}
            colors={colors}
          />
          <ExerciseMoveButton
            direction="down"
            disabled={index === total - 1}
            label={t(
              "Übung nach unten verschieben",
              "Move exercise down",
              "Przesuń ćwiczenie w dół",
            )}
            onPress={onMoveDown}
            colors={colors}
          />
          {total > 1 ? (
            <Pressable
              accessibilityLabel={t("Übung löschen", "Delete exercise")}
              onPress={() => {
                hapticSelection();
                onRemove();
              }}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: ZAYMAX_DESIGN.radius.round,
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <IconSymbol name="trash.fill" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <TextInput
        value={exercise.name}
        onChangeText={(value) => onChange({ name: value })}
        placeholder={t(
          "Übungsname, z. B. Bankdrücken",
          "Exercise name, e.g. Bench Press",
        )}
        placeholderTextColor={colors.muted}
        style={{
          minHeight: 44,
          marginTop: 9,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: ZAYMAX_DESIGN.radius.input,
          paddingHorizontal: 13,
          paddingVertical: 9,
          color: colors.foreground,
          backgroundColor: colors.background,
          fontSize: 14,
          fontWeight: "700",
        }}
      />
      <View className="mt-3 w-24">
        <NumberField
          label={t("Sätze", "Sets")}
          value={exercise.sets}
          onChange={(value) => {
            const sets = Math.min(20, Math.floor(value));
            const repsPerSet = resizeRepsPerSet(exercise, sets);
            const weightsPerSetKg = resizeWeightsPerSet(exercise, sets);
            onChange({
              sets,
              reps: repsPerSet[0] ?? 0,
              repsPerSet,
              weightKg: weightsPerSetKg[0] ?? undefined,
              weightsPerSetKg,
            });
          }}
          colors={colors}
        />
      </View>
      <Text className="mt-4 text-[11px] font-black uppercase tracking-[1px] text-muted">
        {t("Werte pro Satz", "Values per set")}
      </Text>
      <View className="mt-2 gap-1.5">
        {resizeRepsPerSet(exercise, exercise.sets).map((reps, setIndex) => (
          <SetDetailRow
            key={setIndex}
            setNumber={setIndex + 1}
            reps={reps}
            weightKg={resizeWeightsPerSet(exercise, exercise.sets)[setIndex]}
            unit={unit}
            colors={colors}
            onRepsChange={(value) => {
              const repsPerSet = resizeRepsPerSet(exercise, exercise.sets);
              repsPerSet[setIndex] = value;
              onChange({ reps: repsPerSet[0] ?? 0, repsPerSet });
            }}
            onWeightChange={(value) => {
              const weightsPerSetKg = resizeWeightsPerSet(
                exercise,
                exercise.sets,
              );
              weightsPerSetKg[setIndex] = value ? toKg(value, unit) : null;
              onChange({
                weightKg: weightsPerSetKg[0] ?? undefined,
                weightsPerSetKg,
              });
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function ExerciseMoveButton({
  direction,
  disabled,
  label,
  onPress,
  colors,
}: {
  direction: "up" | "down";
  disabled: boolean;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: ZAYMAX_DESIGN.radius.round,
        borderWidth: 1,
        borderColor: disabled ? colors.border : `${colors.primary}80`,
        backgroundColor: disabled
          ? "transparent"
          : ZAYMAX_DESIGN.colors.goldSoft,
        opacity: disabled ? 0.28 : pressed ? 0.58 : 1,
      })}
    >
      <IconSymbol
        name={direction === "up" ? "arrow.up" : "arrow.down"}
        size={21}
        color={disabled ? colors.muted : colors.primary}
      />
    </Pressable>
  );
}

function NumberField({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  colors: any;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[11px] font-bold uppercase tracking-[1px] text-muted">
        {label}
      </Text>
      <TextInput
        value={value ? String(value) : ""}
        onChangeText={(text) =>
          onChange(Number(text.replace(/[^0-9.]/g, "")) || 0)
        }
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.muted}
        style={{
          width: "100%",
          minHeight: 42,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: ZAYMAX_DESIGN.radius.input,
          paddingVertical: 8,
          textAlign: "center",
          color: colors.foreground,
          backgroundColor: colors.background,
          fontWeight: "700",
        }}
      />
    </View>
  );
}
function SetDetailRow({
  setNumber,
  reps,
  weightKg,
  unit,
  onRepsChange,
  onWeightChange,
  colors,
}: {
  setNumber: number;
  reps: number;
  weightKg: number | null | undefined;
  unit: WeightUnit;
  onRepsChange: (value: number) => void;
  onWeightChange: (value: number) => void;
  colors: any;
}) {
  const { t } = useLanguage();
  const shownWeight = weightKg
    ? Number((unit === "lbs" ? weightKg * 2.20462 : weightKg).toFixed(1))
    : 0;
  return (
    <View
      className="flex-row items-end border bg-background"
      style={{
        width: "100%",
        minWidth: 0,
        gap: 7,
        borderColor: colors.border,
        borderRadius: ZAYMAX_DESIGN.radius.nested,
        paddingHorizontal: 9,
        paddingVertical: 9,
      }}
    >
      <View style={{ width: 48, paddingBottom: 8 }}>
        <Text className="text-[9px] font-black uppercase tracking-[1px] text-muted">
          {t("Satz", "Set")}
        </Text>
        <Text
          style={{
            marginTop: 2,
            color: colors.primary,
            fontSize: 17,
            fontWeight: "900",
          }}
        >
          {String(setNumber).padStart(2, "0")}
        </Text>
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="mb-1 text-[9px] font-bold uppercase tracking-[0.8px] text-muted">
          {t("Wdh.", "Reps")}
        </Text>
        <TextInput
          value={reps ? String(reps) : ""}
          onChangeText={(text) =>
            onRepsChange(Number(text.replace(/[^0-9]/g, "")) || 0)
          }
          keyboardType="number-pad"
          placeholder="—"
          placeholderTextColor={colors.muted}
          style={{
            width: "100%",
            minHeight: 43,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: ZAYMAX_DESIGN.radius.input,
            paddingVertical: 8,
            textAlign: "center",
            color: colors.foreground,
            backgroundColor: colors.surface,
            fontWeight: "800",
          }}
        />
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="mb-1 text-[9px] font-bold uppercase tracking-[0.6px] text-muted">
          {unit} · {t("optional", "optional")}
        </Text>
        <DecimalWeightInput
          value={shownWeight}
          onChange={onWeightChange}
          colors={colors}
        />
      </View>
    </View>
  );
}

function DecimalWeightInput({
  value,
  onChange,
  colors,
}: {
  value: number;
  onChange: (value: number) => void;
  colors: any;
}) {
  const { language } = useLanguage();
  const [draft, setDraft] = useState(() =>
    formatDecimalWeight(value, language),
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatDecimalWeight(value, language));
  }, [focused, language, value]);

  return (
    <TextInput
      value={draft}
      selectTextOnFocus
      maxLength={7}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setDraft(formatDecimalWeight(value, language));
      }}
      onChangeText={(text) => {
        const sanitized = text.replace(",", ".").replace(/[^0-9.]/g, "");
        const [whole = "", ...decimalParts] = sanitized.split(".");
        const normalized = decimalParts.length
          ? `${whole}.${decimalParts.join("").slice(0, 2)}`
          : whole;
        setDraft(
          normalized.replace(".", usesDecimalComma(language) ? "," : "."),
        );
        if (!normalized) {
          onChange(0);
          return;
        }
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      keyboardType="decimal-pad"
      placeholder="—"
      placeholderTextColor={colors.muted}
      style={{
        width: "100%",
        minHeight: 43,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: ZAYMAX_DESIGN.radius.input,
        paddingVertical: 8,
        textAlign: "center",
        color: colors.foreground,
        backgroundColor: colors.surface,
        fontWeight: "800",
      }}
    />
  );
}

function formatDecimalWeight(value: number, language: AppLanguage) {
  return value
    ? String(Number(value.toFixed(1))).replace(
        ".",
        usesDecimalComma(language) ? "," : ".",
      )
    : "";
}
