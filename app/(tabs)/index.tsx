import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

import { GlassMaterial } from "@/components/glass-material";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useLanguage, type AppLanguage } from "@/lib/i18n";
import {
  clearActiveSession,
  exerciseSummary,
  loadActiveSession,
  loadSettings,
  loadWorkouts,
  saveWorkouts,
  type WeightUnit,
  type Workout,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";
import {
  hapticAction,
  hapticSelection,
  hapticTap,
  hapticWarning,
} from "@/lib/haptics";

const logo = require("../../assets/images/icon.png");

export default function HomeScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { language, t } = useLanguage();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [all, settings, activeSession] = await Promise.all([
      loadWorkouts(),
      loadSettings(),
      loadActiveSession(),
    ]);
    const validActiveId = all.some(
      (workout) => workout.id === activeSession?.workoutId,
    )
      ? (activeSession?.workoutId ?? null)
      : null;
    if (activeSession?.workoutId && !validActiveId) {
      await clearActiveSession();
    }
    setWorkouts(all);
    setWeightUnit(settings.weightUnit);
    setActiveWorkoutId(validActiveId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        // Keep the last rendered list instead of producing an unhandled error.
      });
    }, [refresh]),
  );
  const completed = useMemo(
    () => workouts.filter((item) => item.completedAt).length,
    [workouts],
  );
  const nextWorkout = useMemo(
    () =>
      workouts.find((item) => item.id === activeWorkoutId) ??
      workouts.find((item) => !item.completedAt) ??
      workouts[0],
    [activeWorkoutId, workouts],
  );
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("Guten Morgen", "Good morning");
    if (hour < 18) return t("Guten Tag", "Good afternoon");
    return t("Guten Abend", "Good evening");
  }, [t]);

  async function toggleLock(workout: Workout) {
    try {
      const all = await loadWorkouts();
      const now = new Date().toISOString();
      const lockedAt = workout.lockedAt ? undefined : now;
      const updated = all.map((item) =>
        item.id === workout.id ? { ...item, lockedAt, updatedAt: now } : item,
      );
      await saveWorkouts(updated);
      setWorkouts(updated);
      hapticSelection();
    } catch {
      showWorkoutStorageError();
    }
  }

  function editWorkout(workout: Workout) {
    if (workout.id === activeWorkoutId) {
      showActiveWorkoutAlert(workout);
      return;
    }
    if (workout.lockedAt) {
      hapticWarning();
      Alert.alert(
        t("Workout ist geschützt", "Workout is protected"),
        t(
          "Hebe den Schutz zuerst auf, um die Vorlage manuell zu bearbeiten.",
          "Remove protection before editing the template.",
        ),
      );
      return;
    }
    hapticTap();
    router.push({ pathname: "/workout/[id]", params: { id: workout.id } });
  }

  function confirmDelete(workout: Workout) {
    if (workout.id === activeWorkoutId) {
      showActiveWorkoutAlert(workout);
      return;
    }
    if (workout.lockedAt) {
      hapticWarning();
      Alert.alert(
        t("Workout ist geschützt", "Workout is protected"),
        t(
          "Hebe den Schutz zuerst auf, bevor du es löschst.",
          "Remove protection before deleting it.",
        ),
      );
      return;
    }
    hapticTap();
    Alert.alert(
      t("Workout löschen?", "Delete workout?"),
      t(
        "Das Workout wird dauerhaft gelöscht.",
        "This workout will be deleted permanently.",
      ),
      [
        { text: t("Abbrechen", "Cancel"), style: "cancel" },
        {
          text: t("Löschen", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const all = await loadWorkouts();
              await saveWorkouts(all.filter((item) => item.id !== workout.id));
              setWorkouts((current) =>
                current.filter((item) => item.id !== workout.id),
              );
              hapticWarning();
            } catch {
              showWorkoutStorageError();
            }
          },
        },
      ],
    );
  }

  function openActiveWorkout(workoutId: string) {
    router.push({
      pathname: "/workout/active/[id]",
      params: { id: workoutId },
    });
  }

  function showActiveWorkoutAlert(requestedWorkout: Workout) {
    const activeWorkout = workouts.find((item) => item.id === activeWorkoutId);
    hapticWarning();
    Alert.alert(
      t(
        "Training läuft bereits",
        "A workout is already running",
        "Trening już trwa",
      ),
      t(
        `${activeWorkout?.title ?? requestedWorkout.title} bleibt aktiv. Öffne zuerst dieses Training oder brich es dort ab.`,
        `${activeWorkout?.title ?? requestedWorkout.title} remains active. Open it first or cancel it there.`,
        `${activeWorkout?.title ?? requestedWorkout.title} pozostaje aktywny. Najpierw otwórz ten trening lub przerwij go w jego widoku.`,
      ),
      [
        { text: t("Abbrechen", "Cancel", "Anuluj"), style: "cancel" },
        {
          text: t(
            "Laufendes Training öffnen",
            "Open active workout",
            "Otwórz aktywny trening",
          ),
          onPress: () => {
            if (activeWorkoutId) openActiveWorkout(activeWorkoutId);
          },
        },
      ],
    );
  }

  function startWorkout(workout: Workout) {
    if (activeWorkoutId && activeWorkoutId !== workout.id) {
      showActiveWorkoutAlert(workout);
      return;
    }
    hapticAction();
    openActiveWorkout(activeWorkoutId ?? workout.id);
  }

  function showWorkoutStorageError() {
    hapticWarning();
    Alert.alert(
      t(
        "Änderung nicht gespeichert",
        "Change not saved",
        "Nie zapisano zmiany",
      ),
      t(
        "Deine Workouts bleiben unverändert. Bitte versuche es erneut.",
        "Your workouts remain unchanged. Please try again.",
        "Twoje treningi pozostają bez zmian. Spróbuj ponownie.",
      ),
    );
  }

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.duration(180)}
          className="flex-row items-center justify-between pt-3 pb-5"
          style={{ position: "relative" }}
        >
          <View className="flex-row items-center" style={{ paddingRight: 82 }}>
            <View
              className="mr-3 h-11 w-11 overflow-hidden rounded-full"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
              }}
            >
              <Image
                source={logo}
                resizeMode="contain"
                style={{ width: "100%", height: "100%" }}
              />
            </View>
            <View>
              <Text
                className="text-[10px] font-black tracking-[3px]"
                style={{ color: colors.primary }}
              >
                ZAYMAX
              </Text>
              <Text className="mt-1 text-[22px] font-black text-foreground">
                {greeting}
              </Text>
            </View>
          </View>
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <HeaderButton
              label={t("Historie öffnen", "Open history")}
              icon="book.closed.fill"
              onPress={() => router.push("/training-history" as Href)}
              colors={colors}
            />
            <HeaderButton
              label={t("Einstellungen öffnen", "Open settings")}
              icon="gearshape.fill"
              onPress={() => router.push("/settings")}
              colors={colors}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(ZAYMAX_DESIGN.motion.standard)}
          style={{
            minHeight: 238,
            position: "relative",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "transparent",
            paddingHorizontal: 18,
            paddingVertical: 18,
            borderRadius: ZAYMAX_DESIGN.radius.hero,
            ...ZAYMAX_DESIGN.shadow,
          }}
        >
          <GlassMaterial
            raised
            intensity={30}
            radius={ZAYMAX_DESIGN.radius.hero}
          />
          <View className="flex-row items-start justify-between">
            <View
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
                borderRadius: ZAYMAX_DESIGN.radius.round,
              }}
            >
              <IconSymbol
                name={
                  nextWorkout ? "figure.strengthtraining.traditional" : "plus"
                }
                size={23}
                color={colors.primary}
              />
            </View>
            <Text className="pt-1 text-[10px] font-black uppercase tracking-[3px] text-muted">
              {t("HEUTE", "TODAY")}
            </Text>
          </View>
          <Text className="mt-5 text-[26px] font-black leading-8 text-foreground">
            {t("Bereit fürs Training?", "Ready to train?")}
          </Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            {nextWorkout
              ? t(
                  `${nextWorkout.title} · ${nextWorkout.exercises.length} ${nextWorkout.exercises.length === 1 ? "Übung wartet" : "Übungen warten"} auf dich.`,
                  `${nextWorkout.title} · ${nextWorkout.exercises.length} ${nextWorkout.exercises.length === 1 ? "exercise is" : "exercises are"} waiting.`,
                  `${nextWorkout.title} · ${nextWorkout.exercises.length} ${nextWorkout.exercises.length === 1 ? "ćwiczenie czeka" : "ćwiczenia czekają"} na Ciebie.`,
                )
              : t(
                  "Erstelle deinen ersten Plan und trainiere genau nach deinen Regeln.",
                  "Create your first plan and train by your own rules.",
                )}
          </Text>
          <Pressable
            accessibilityLabel={
              nextWorkout
                ? activeWorkoutId
                  ? t(
                      "Laufendes Training fortsetzen",
                      "Resume active workout",
                      "Wznów aktywny trening",
                    )
                  : t("Training jetzt starten", "Start workout now")
                : t("Neues Workout erstellen", "Create new workout")
            }
            onPress={() => {
              if (nextWorkout) {
                startWorkout(nextWorkout);
              } else {
                hapticAction();
                router.push({
                  pathname: "/workout/[id]",
                  params: { id: "new" },
                });
              }
            }}
            style={({ pressed }) => [
              {
                marginTop: 18,
                width: "100%",
                minHeight: 50,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: ZAYMAX_DESIGN.colors.action,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Text className="font-black tracking-[0.4px] text-background">
              {nextWorkout
                ? activeWorkoutId
                  ? t("Training fortsetzen", "Resume workout", "Wznów trening")
                  : t("Training starten", "Start workout")
                : t("Workout erstellen", "Create workout")}
            </Text>
          </Pressable>
          {nextWorkout ? (
            <Pressable
              accessibilityLabel={t(
                "Neues Workout erstellen",
                "Create new workout",
              )}
              onPress={() => {
                hapticTap();
                router.push({
                  pathname: "/workout/[id]",
                  params: { id: "new" },
                });
              }}
              style={({ pressed }) => [
                {
                  marginTop: 10,
                  width: "100%",
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <IconSymbol name="plus" size={18} color={colors.primary} />
              <Text className="text-sm font-black tracking-[0.3px] text-foreground">
                {t("Neues Workout erstellen", "Create new workout")}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>

        <View className="mt-3 flex-row gap-3">
          <QuickCard
            icon="book.closed.fill"
            eyebrow={t("FORTSCHRITT", "PROGRESS")}
            title={t("Historie", "History")}
            onPress={() => router.push("/training-history" as Href)}
            colors={colors}
          />
          <QuickCard
            icon="pencil"
            eyebrow={t("GEDANKEN", "THOUGHTS")}
            title={t("Tagebuch", "Journal")}
            onPress={() => router.push("/(tabs)/reminders" as Href)}
            colors={colors}
          />
        </View>

        <View className="mt-7 flex-row items-end justify-between">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[2.5px] text-muted">
              {t("BIBLIOTHEK", "LIBRARY")}
            </Text>
            <Text className="mt-2 text-xl font-black text-foreground">
              {t("Deine Pläne", "Your plans")}
            </Text>
          </View>
          <Text className="text-xs font-bold text-muted">
            {workouts.length} {workouts.length === 1 ? "Workout" : "Workouts"} ·{" "}
            {completed} {t("fertig", "done")}
          </Text>
        </View>

        {workouts.length ? (
          workouts.map((workout, index) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              index={index}
              colors={colors}
              unit={weightUnit}
              language={language}
              onEdit={() => editWorkout(workout)}
              onStart={() => startWorkout(workout)}
              onToggleLock={() => void toggleLock(workout)}
              onDelete={() => confirmDelete(workout)}
            />
          ))
        ) : (
          <View
            className="mt-3 border border-border"
            style={{
              borderRadius: ZAYMAX_DESIGN.radius.card,
              backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
              padding: ZAYMAX_DESIGN.spacing.card,
            }}
          >
            <Text className="font-black uppercase text-foreground">
              {t("Noch kein eigenes Workout", "No custom workout yet")}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              {t(
                "Erstelle dein erstes Workout und passe jede Übung an deinen Stil an.",
                "Create your first workout and tailor every exercise to your style.",
              )}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function HeaderButton({
  label,
  icon,
  onPress,
  colors,
}: {
  label: string;
  icon: "book.closed.fill" | "gearshape.fill";
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => {
        hapticTap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
          borderRadius: ZAYMAX_DESIGN.radius.round,
          marginLeft: 6,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <IconSymbol name={icon} size={21} color={colors.primary} />
    </Pressable>
  );
}

function QuickCard({
  icon,
  eyebrow,
  title,
  onPress,
  colors,
}: {
  icon: "book.closed.fill" | "pencil";
  eyebrow: string;
  title: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={() => {
        hapticTap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 118,
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: "transparent",
          borderRadius: ZAYMAX_DESIGN.radius.card,
          padding: 15,
          overflow: "hidden",
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <GlassMaterial intensity={24} />
      <View
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
          borderRadius: ZAYMAX_DESIGN.radius.round,
        }}
      >
        <IconSymbol name={icon} size={19} color={colors.primary} />
      </View>
      <View>
        <Text
          style={{
            color: colors.muted,
            fontSize: 9,
            fontWeight: "900",
            letterSpacing: 1.7,
          }}
        >
          {eyebrow}
        </Text>
        <Text
          style={{
            marginTop: 4,
            color: colors.foreground,
            fontSize: 17,
            fontWeight: "900",
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

function WorkoutCard({
  workout,
  index,
  colors,
  unit,
  language,
  onEdit,
  onStart,
  onToggleLock,
  onDelete,
}: {
  workout: Workout;
  index: number;
  colors: any;
  unit: WeightUnit;
  language: AppLanguage;
  onEdit: () => void;
  onStart: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 35, 140)).duration(180)}
      layout={Layout.duration(140)}
    >
      <View
        style={{
          marginTop: 12,
          minHeight: 172,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: workout.lockedAt ? colors.primary : colors.border,
          padding: 16,
          borderRadius: ZAYMAX_DESIGN.radius.card,
        }}
      >
        <GlassMaterial intensity={25} />
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <View
            style={{
              marginRight: 12,
              width: 46,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
              borderRadius: ZAYMAX_DESIGN.radius.round,
            }}
          >
            <IconSymbol
              name={
                workout.lockedAt
                  ? "lock.fill"
                  : "figure.strengthtraining.traditional"
              }
              size={21}
              color={colors.primary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-foreground">
              {workout.title}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {workout.exercises.length}{" "}
              {workout.exercises.length === 1
                ? t("Übung", "exercise")
                : t("Übungen", "exercises")}{" "}
              · {exerciseSummary(workout.exercises[0], unit, language)}
            </Text>
            {workout.lockedAt ? (
              <Text className="mt-2 text-xs font-black tracking-[0.5px] text-foreground">
                {t("Geschützt · bleibt auf Home", "Protected · stays on Home")}
              </Text>
            ) : workout.completedAt ? (
              <Text
                style={{
                  marginTop: 8,
                  color: ZAYMAX_DESIGN.colors.success,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                ✓ {t("Zuletzt abgeschlossen", "Recently completed")}
              </Text>
            ) : null}
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.muted} />
        </Pressable>
        <View className="mt-5 flex-row gap-2">
          <Pressable
            onPress={onStart}
            style={({ pressed }) => [
              {
                flex: 1,
                minHeight: 46,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: ZAYMAX_DESIGN.colors.action,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text className="text-center text-sm font-black tracking-[0.4px] text-background">
              {t("Training starten", "Start workout")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={
              workout.lockedAt
                ? t("Workout-Schutz aufheben", "Unprotect workout")
                : t("Workout schützen", "Protect workout")
            }
            onPress={onToggleLock}
            style={({ pressed }) => [
              {
                width: 48,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: workout.lockedAt ? colors.primary : colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <IconSymbol
              name={workout.lockedAt ? "lock.fill" : "lock.open.fill"}
              size={20}
              color={workout.lockedAt ? colors.primary : colors.foreground}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={t("Workout löschen", "Delete workout")}
            onPress={onDelete}
            style={({ pressed }) => [
              {
                width: 48,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <IconSymbol name="trash.fill" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
