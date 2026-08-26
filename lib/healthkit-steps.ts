import { Platform } from "react-native";

import { buildStepWeek, stepDayKey, type StepWeek } from "@/lib/steps";

const STEP_COUNT_IDENTIFIER = "HKQuantityTypeIdentifierStepCount" as const;

async function loadHealthKit() {
  return import("@kingstinct/react-native-healthkit");
}

export async function isAppleHealthAvailable() {
  if (Platform.OS !== "ios") return false;
  const healthKit = await loadHealthKit();
  return healthKit.isHealthDataAvailable();
}

export async function requestStepAuthorization() {
  const healthKit = await loadHealthKit();
  return healthKit.requestAuthorization({
    toRead: [STEP_COUNT_IDENTIFIER],
  });
}

export async function loadCurrentStepWeek(now = new Date()): Promise<StepWeek> {
  const healthKit = await loadHealthKit();
  const emptyWeek = buildStepWeek(now);
  const queryEnd = new Date(
    Math.min(now.getTime(), emptyWeek.endDate.getTime()),
  );
  const statistics = await healthKit.queryStatisticsCollectionForQuantity(
    STEP_COUNT_IDENTIFIER,
    ["cumulativeSum"],
    emptyWeek.startDate,
    { day: 1 },
    {
      unit: "count",
      filter: {
        date: {
          startDate: emptyWeek.startDate,
          endDate: queryEnd,
          strictStartDate: true,
          strictEndDate: true,
        },
      },
    },
  );
  const stepsByDay = new Map<string, number>();

  statistics.forEach((entry) => {
    if (!entry.startDate) return;
    const key = stepDayKey(new Date(entry.startDate));
    const steps = entry.sumQuantity?.quantity ?? 0;
    stepsByDay.set(key, (stepsByDay.get(key) ?? 0) + steps);
  });

  return buildStepWeek(now, stepsByDay);
}
