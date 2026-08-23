import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useLanguage } from "@/lib/i18n";
import {
  exerciseSummary,
  loadSettings,
  loadWorkouts,
  saveWorkouts,
  type WeightUnit,
  type Workout,
} from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";

const logo = require("../../assets/images/icon.png");

export default function HomeScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { language, t } = useLanguage();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  const refresh = useCallback(async () => {
    const [all, settings] = await Promise.all([loadWorkouts(), loadSettings()]);
    setWorkouts(all);
    setWeightUnit(settings.weightUnit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const completed = useMemo(
    () => workouts.filter((item) => item.completedAt).length,
    [workouts],
  );
  const nextWorkout = useMemo(
    () => workouts.find((item) => !item.completedAt) ?? workouts[0],
    [workouts],
  );
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("Guten Morgen", "Good morning");
    if (hour < 18) return t("Guten Tag", "Good afternoon");
    return t("Guten Abend", "Good evening");
  }, [t]);

  async function toggleLock(workout: Workout) {
    const all = await loadWorkouts();
    const now = new Date().toISOString();
    const lockedAt = workout.lockedAt ? undefined : now;
    const updated = all.map((item) =>
      item.id === workout.id ? { ...item, lockedAt, updatedAt: now } : item,
    );
    await saveWorkouts(updated);
    setWorkouts(updated);
    if (process.env.NODE_ENV !== "test")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function editWorkout(workout: Workout) {
    if (workout.lockedAt) {
      Alert.alert(
        t("Workout ist geschützt", "Workout is protected"),
        t(
          "Hebe den Schutz zuerst auf, um die Vorlage manuell zu bearbeiten.",
          "Remove protection before editing the template.",
        ),
      );
      return;
    }
    router.push({ pathname: "/workout/[id]", params: { id: workout.id } });
  }

  function confirmDelete(workout: Workout) {
    if (workout.lockedAt) {
      Alert.alert(
        t("Workout ist geschützt", "Workout is protected"),
        t(
          "Hebe den Schutz zuerst auf, bevor du es löschst.",
          "Remove protection before deleting it.",
        ),
      );
      return;
    }
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
            const all = await loadWorkouts();
            await saveWorkouts(all.filter((item) => item.id !== workout.id));
            setWorkouts((current) =>
              current.filter((item) => item.id !== workout.id),
            );
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 34 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.duration(180)}
          className="flex-row items-center justify-between pt-4 pb-6"
          style={{ position: "relative" }}
        >
          <View className="flex-row items-center" style={{ paddingRight: 82 }}>
            <View className="mr-3 h-12 w-12 overflow-hidden rounded-full border border-border bg-black">
              <Image
                source={logo}
                resizeMode="contain"
                style={{ width: "100%", height: "100%" }}
              />
            </View>
            <View>
              <Text className="text-[10px] font-black tracking-[3px] text-muted">
                ZAYMAX
              </Text>
              <Text className="mt-1 text-xl font-black text-foreground">
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
            minHeight: 272,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 21,
            paddingVertical: 22,
            borderRadius: ZAYMAX_DESIGN.radius.hero,
          }}
        >
          <View className="flex-row items-start justify-between">
            <View
              style={{
                width: 58,
                height: 58,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderRadius: ZAYMAX_DESIGN.radius.round,
              }}
            >
              <IconSymbol
                name={
                  nextWorkout ? "figure.strengthtraining.traditional" : "plus"
                }
                size={27}
                color={colors.foreground}
              />
            </View>
            <Text className="pt-1 text-[10px] font-black uppercase tracking-[3px] text-muted">
              {t("HEUTE", "TODAY")}
            </Text>
          </View>
          <Text className="mt-6 text-[28px] font-black leading-8 text-foreground">
            {t("Bereit fürs Training?", "Ready to train?")}
          </Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            {nextWorkout
              ? t(
                  `${nextWorkout.title} · ${nextWorkout.exercises.length} ${nextWorkout.exercises.length === 1 ? "Übung wartet" : "Übungen warten"} auf dich.`,
                  `${nextWorkout.title} · ${nextWorkout.exercises.length} ${nextWorkout.exercises.length === 1 ? "exercise is" : "exercises are"} waiting.`,
                )
              : t(
                  "Erstelle deinen ersten Plan und trainiere genau nach deinen Regeln.",
                  "Create your first plan and train by your own rules.",
                )}
          </Text>
          <Pressable
            accessibilityLabel={
              nextWorkout
                ? t("Training jetzt starten", "Start workout now")
                : t("Neues Workout erstellen", "Create new workout")
            }
            onPress={() =>
              nextWorkout
                ? router.push({
                    pathname: "/workout/active/[id]",
                    params: { id: nextWorkout.id },
                  })
                : router.push({
                    pathname: "/workout/[id]",
                    params: { id: "new" },
                  })
            }
            style={({ pressed }) => [
              {
                marginTop: 22,
                width: "100%",
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Text className="font-black tracking-[0.4px] text-background">
              {nextWorkout
                ? t("Training starten", "Start workout")
                : t("Workout erstellen", "Create workout")}
            </Text>
          </Pressable>
          {nextWorkout ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/workout/[id]",
                  params: { id: "new" },
                })
              }
              style={({ pressed }) => ({
                alignSelf: "center",
                paddingTop: 14,
                paddingHorizontal: 12,
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <Text className="text-sm font-bold text-muted">
                + {t("Neues Workout", "New workout")}
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

        <View className="mt-8 flex-row items-end justify-between">
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
              onStart={() =>
                router.push({
                  pathname: "/workout/active/[id]",
                  params: { id: workout.id },
                })
              }
              onToggleLock={() => void toggleLock(workout)}
              onDelete={() => confirmDelete(workout)}
            />
          ))
        ) : (
          <View className="mt-3 rounded-3xl border border-border bg-surface/80 p-5">
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
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: ZAYMAX_DESIGN.radius.round,
          marginLeft: 6,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <IconSymbol name={icon} size={21} color={colors.foreground} />
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
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 134,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: ZAYMAX_DESIGN.radius.card,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 54,
          height: 54,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.foreground,
          backgroundColor: colors.background,
          borderRadius: ZAYMAX_DESIGN.radius.round,
        }}
      >
        <IconSymbol name={icon} size={24} color={colors.foreground} />
      </View>
      <Text
        style={{
          marginTop: 14,
          color: colors.muted,
          fontSize: 9,
          fontWeight: "900",
          letterSpacing: 2,
        }}
      >
        {eyebrow}
      </Text>
      <Text
        style={{
          marginTop: 5,
          color: colors.foreground,
          fontSize: 17,
          fontWeight: "900",
        }}
      >
        {title}
      </Text>
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
  language: "de" | "en";
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
          minHeight: 194,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: workout.lockedAt ? colors.foreground : colors.border,
          padding: 17,
          borderRadius: ZAYMAX_DESIGN.radius.card,
        }}
      >
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
              marginRight: 14,
              width: 54,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              borderRadius: ZAYMAX_DESIGN.radius.round,
            }}
          >
            <IconSymbol
              name={
                workout.lockedAt
                  ? "lock.fill"
                  : "figure.strengthtraining.traditional"
              }
              size={24}
              color={colors.foreground}
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
        <View className="mt-10 flex-row gap-2">
          <Pressable
            onPress={onStart}
            style={({ pressed }) => [
              {
                flex: 1,
                minHeight: 46,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
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
                borderColor: workout.lockedAt
                  ? colors.foreground
                  : colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <IconSymbol
              name={workout.lockedAt ? "lock.fill" : "lock.open.fill"}
              size={20}
              color={colors.foreground}
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
