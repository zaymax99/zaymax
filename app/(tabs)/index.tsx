import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
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
          className="flex-row items-center justify-between pt-4 pb-7"
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
              <Text className="text-xs font-black tracking-[3px] text-muted">
                ZAYMAX / 01
              </Text>
              <Text className="mt-1 text-xl font-black uppercase text-foreground">
                {t("Meine Workouts", "My workouts")}
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

        <View
          style={{
            minHeight: 286,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: `${colors.surface}E8`,
            paddingHorizontal: 22,
            paddingVertical: 26,
            borderRadius: 28,
          }}
        >
          <Text className="text-[10px] font-black uppercase tracking-[3px] text-muted">
            {t("DEIN SYSTEM", "YOUR SYSTEM")}
          </Text>
          <View
            style={{
              marginTop: 19,
              width: 82,
              height: 82,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: colors.background,
              borderRadius: 999,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.foreground,
                backgroundColor: colors.surface,
                borderRadius: 999,
              }}
            >
              <IconSymbol name="plus" size={36} color={colors.foreground} />
            </View>
          </View>
          <Text className="mt-5 text-center text-2xl font-black uppercase tracking-[0.5px] text-foreground">
            {t("Workout selbst erstellen", "Build your own workout")}
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted">
            {t(
              "Übungen, Sätze, Wiederholungen und Gewicht – exakt nach deinen Regeln.",
              "Exercises, sets, reps and weight — built around your rules.",
            )}
          </Text>
          <Pressable
            accessibilityLabel={t(
              "Neues Workout erstellen",
              "Create new workout",
            )}
            onPress={() =>
              router.push({ pathname: "/workout/[id]", params: { id: "new" } })
            }
            style={({ pressed }) => [
              {
                marginTop: 21,
                width: "100%",
                minHeight: 50,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                borderRadius: 999,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Text className="font-black uppercase tracking-[1px] text-background">
              {t("Neues Workout erstellen", "Create new workout")}
            </Text>
          </Pressable>
        </View>

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
            <Text className="mt-2 text-xl font-black uppercase text-foreground">
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
          borderRadius: 999,
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
          minHeight: 144,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: `${colors.surface}D8`,
          borderRadius: 24,
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
          borderRadius: 999,
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
          textTransform: "uppercase",
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
          minHeight: 200,
          backgroundColor: `${colors.surface}E8`,
          borderWidth: 1,
          borderColor: workout.lockedAt ? colors.foreground : colors.border,
          padding: 17,
          borderRadius: 24,
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
              borderRadius: 999,
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
            <Text className="text-lg font-black uppercase text-foreground">
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
              <Text className="mt-2 text-xs font-black uppercase tracking-[1px] text-foreground">
                {t("Geschützt · bleibt auf Home", "Protected · stays on Home")}
              </Text>
            ) : workout.completedAt ? (
              <Text className="mt-2 text-xs font-bold text-muted">
                {t("Zuletzt abgeschlossen", "Recently completed")}
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
                borderRadius: 999,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text className="text-center text-sm font-black uppercase tracking-[0.8px] text-background">
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
                borderRadius: 999,
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
                borderRadius: 999,
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
