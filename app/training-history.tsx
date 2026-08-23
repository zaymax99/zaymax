import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { displayWeight, formatDateTime, loadSettings, loadWorkoutHistory, type WeightUnit, type WorkoutHistoryEntry } from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";

const effortLabels = { leicht: "Leicht", gut: "Gut", hart: "Hart" } as const;

export default function TrainingHistoryScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  const refresh = useCallback(async () => {
    const [entries, settings] = await Promise.all([loadWorkoutHistory(), loadSettings()]);
    setHistory(entries);
    setWeightUnit(settings.weightUnit);
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="flex-row items-center pt-3 pb-7">
            <ZaymaxWatermark />
            <Pressable accessibilityLabel="Zurück" onPress={() => router.back()} style={({ pressed }) => [{ padding: 8, marginRight: 6, opacity: pressed ? 0.6 : 1 }]}>
              <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-muted">DEINE LEISTUNG</Text>
              <Text className="mt-1 text-3xl font-bold text-foreground">Historie</Text>
              <Text className="mt-2 text-base text-muted">Deine zuletzt abgeschlossenen Sätze.</Text>
            </View>
            <IconSymbol name="book.closed.fill" size={24} color={colors.foreground} />
          </View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(300)} className="flex-1 items-center justify-center rounded-md bg-surface/80 p-7" style={{ borderWidth: 1, borderColor: colors.border }}>
            <View className="h-14 w-14 items-center justify-center rounded-sm bg-background">
              <IconSymbol name="book.closed.fill" size={26} color={colors.foreground} />
            </View>
            <Text className="mt-4 text-center text-lg font-bold text-foreground">Noch keine Einträge</Text>
            <Text className="mt-2 text-center leading-5 text-muted">Beende ein Training, um deine Sätze, Wiederholungen und Gewichte hier zu sehen.</Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => <HistoryCard entry={item} index={index} unit={weightUnit} colors={colors} />}
      />
    </ScreenContainer>
  );
}

function HistoryCard({ entry, index, unit, colors }: { entry: WorkoutHistoryEntry; index: number; unit: WeightUnit; colors: any }) {
  const totalSets = entry.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} className="mb-4 rounded-md bg-surface/80 p-5" style={{ borderWidth: 1, borderColor: colors.border }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-bold text-foreground">{entry.workoutTitle}</Text>
          <Text className="mt-1 text-sm text-muted">{formatDateTime(entry.completedAt)}</Text>
          {entry.effort ? <Text className="mt-2 text-xs font-bold uppercase tracking-[1.5px] text-foreground">Gefühl · {effortLabels[entry.effort]}</Text> : null}
        </View>
        <View className="rounded-sm border border-border bg-background px-3 py-2">
          <Text className="text-xs font-bold text-foreground">{totalSets} {totalSets === 1 ? "Satz" : "Sätze"}</Text>
        </View>
      </View>

      {entry.exercises.length ? entry.exercises.map((exercise) => (
        <View key={exercise.exerciseId} className="mt-5 border-t border-border pt-4">
          <Text className="font-bold text-foreground">{exercise.name}</Text>
          <View className="mt-3 gap-2">
            {exercise.sets.map((set) => (
              <View key={`${exercise.exerciseId}-${set.setNumber}`} className="flex-row items-center justify-between rounded-sm border border-border bg-background px-3 py-3">
                <Text className="text-sm font-semibold text-muted">Satz {set.setNumber}</Text>
                <Text className="text-sm font-bold text-foreground">{set.reps} Wdh. · {set.weightKg ? displayWeight(set.weightKg, unit) : "ohne Gewicht"}</Text>
              </View>
            ))}
          </View>
        </View>
      )) : (
        <Text className="mt-5 border-t border-border pt-4 text-sm text-muted">Bei diesem Training wurde kein Satz abgehakt.</Text>
      )}
    </Animated.View>
  );
}
