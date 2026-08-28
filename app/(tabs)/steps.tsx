import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

import { GlassMaterial } from "@/components/glass-material";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZaymaxWordmark } from "@/components/zaymax-wordmark";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import {
  hapticAction,
  hapticSuccess,
  hapticTap,
  hapticWarning,
} from "@/lib/haptics";
import {
  isAppleHealthAvailable,
  loadCurrentStepWeek,
  requestStepAuthorization,
} from "@/lib/healthkit-steps";
import {
  appLocaleForLanguage,
  useLanguage,
  type AppLanguage,
  type AppLocale,
} from "@/lib/i18n";
import {
  buildStepWeek,
  DAILY_STEP_GOAL,
  HEALTHKIT_CONNECTED_KEY,
  type StepWeek,
} from "@/lib/steps";
const RING_SIZE = 196;
const RING_TICKS = 49;
const RING_CENTER = RING_SIZE / 2;
const RING_INNER_RADIUS = 76;
const RING_OUTER_RADIUS = 91;

type StepStatus =
  | "checking"
  | "disconnected"
  | "loading"
  | "ready"
  | "unavailable"
  | "error";

export default function StepsScreen() {
  const colors = useColors("dark");
  const { language, locale, t } = useLanguage();
  const [status, setStatus] = useState<StepStatus>("checking");
  const [week, setWeek] = useState<StepWeek>(() => buildStepWeek(new Date()));
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshSteps = useCallback(async (showLoader = true) => {
    if (Platform.OS !== "ios") {
      setStatus("unavailable");
      return false;
    }
    if (showLoader) setStatus("loading");
    else setRefreshing(true);

    try {
      if (!(await isAppleHealthAvailable())) {
        setStatus("unavailable");
        return false;
      }
      const nextWeek = await loadCurrentStepWeek();
      setWeek(nextWeek);
      setLastUpdated(new Date());
      setStatus("ready");
      return true;
    } catch {
      setStatus("error");
      return false;
    } finally {
      if (!showLoader) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void AsyncStorage.getItem(HEALTHKIT_CONNECTED_KEY)
        .then((connected) => {
          if (!active) return;
          if (Platform.OS !== "ios") {
            setStatus("unavailable");
          } else if (connected === "1") {
            void refreshSteps();
          } else {
            setStatus("disconnected");
          }
        })
        .catch(() => {
          if (active) setStatus("error");
        });
      return () => {
        active = false;
      };
    }, [refreshSteps]),
  );

  async function connectAppleHealth() {
    hapticAction();
    setStatus("loading");
    try {
      if (!(await isAppleHealthAvailable())) {
        setStatus("unavailable");
        hapticWarning();
        return;
      }
      const requestCompleted = await requestStepAuthorization();
      if (!requestCompleted) {
        setStatus("error");
        hapticWarning();
        return;
      }
      await AsyncStorage.setItem(HEALTHKIT_CONNECTED_KEY, "1");
      const loaded = await refreshSteps(false);
      if (loaded) hapticSuccess();
      else hapticWarning();
    } catch {
      setStatus("error");
      hapticWarning();
    }
  }

  const todayProgress = Math.min(week.todaySteps / DAILY_STEP_GOAL, 1);
  const rangeLabel = useMemo(
    () =>
      `${formatShortDate(week.startDate, language)} – ${formatShortDate(
        new Date(week.endDate.getTime() - 1),
        language,
      )}`,
    [language, week.endDate, week.startDate],
  );

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          status === "ready" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                hapticTap();
                void refreshSteps(false);
              }}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        contentContainerStyle={{ paddingBottom: 128 }}
      >
        <View className="pt-3 pb-6">
          <ZaymaxWordmark />
          <View>
            <Text className="mt-1 text-3xl font-black text-foreground">
              {t("Schritte", "Steps")}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              {t(
                "Dein Tag und deine Woche auf einen Blick.",
                "Your day and week at a glance.",
              )}
            </Text>
          </View>
        </View>

        {status === "ready" ? (
          <>
            <Animated.View
              entering={FadeInDown.duration(280)}
              style={{
                position: "relative",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.hero,
                backgroundColor: "transparent",
                padding: 18,
                ...ZAYMAX_DESIGN.shadow,
              }}
            >
              <GlassMaterial
                raised
                intensity={30}
                radius={ZAYMAX_DESIGN.radius.hero}
              />
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-[2.5px] text-muted">
                    {t("HEUTE", "TODAY")}
                  </Text>
                  <Text className="mt-2 text-xl font-black text-foreground">
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    }).format(new Date())}
                  </Text>
                </View>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
                  }}
                >
                  <IconSymbol
                    name="shoeprints.fill"
                    size={21}
                    color={colors.primary}
                  />
                </View>
              </View>

              <View className="mt-5 items-center">
                <View style={{ width: RING_SIZE, height: RING_SIZE }}>
                  <Svg width={RING_SIZE} height={RING_SIZE}>
                    {Array.from({ length: RING_TICKS }, (_, index) => {
                      const angle =
                        ((135 + (index / (RING_TICKS - 1)) * 270) * Math.PI) /
                        180;
                      const active =
                        index < Math.round(todayProgress * RING_TICKS);
                      return (
                        <Line
                          key={index}
                          x1={RING_CENTER + Math.cos(angle) * RING_INNER_RADIUS}
                          y1={RING_CENTER + Math.sin(angle) * RING_INNER_RADIUS}
                          x2={RING_CENTER + Math.cos(angle) * RING_OUTER_RADIUS}
                          y2={RING_CENTER + Math.sin(angle) * RING_OUTER_RADIUS}
                          stroke={active ? colors.primary : colors.border}
                          strokeWidth={active ? 4 : 3}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </Svg>
                  <View className="absolute inset-0 items-center justify-center">
                    <Text className="text-4xl font-black text-foreground">
                      {formatSteps(week.todaySteps, locale)}
                    </Text>
                    <Text className="mt-1 text-[10px] font-black uppercase tracking-[2px] text-muted">
                      {t("SCHRITTE", "STEPS")}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-5 flex-row items-center justify-between">
                <Text className="text-xs font-bold text-muted">
                  {t("Tagesziel", "Daily goal")} ·{" "}
                  {formatSteps(DAILY_STEP_GOAL, locale)}
                </Text>
                <Text
                  className="text-xs font-black"
                  style={{ color: colors.primary }}
                >
                  {Math.round(todayProgress * 100)} %
                </Text>
              </View>
              <View
                style={{
                  height: 7,
                  marginTop: 9,
                  overflow: "hidden",
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  backgroundColor: colors.background,
                }}
              >
                <View
                  style={{
                    width: `${todayProgress * 100}%`,
                    height: "100%",
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    backgroundColor: colors.primary,
                  }}
                />
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(70).duration(280)}
              style={{
                marginTop: 14,
                position: "relative",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.card,
                backgroundColor: "transparent",
                padding: 18,
              }}
            >
              <GlassMaterial intensity={24} />
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-[2.5px] text-muted">
                    {t("DIESE WOCHE", "THIS WEEK")}
                  </Text>
                  <Text className="mt-2 text-3xl font-black text-foreground">
                    {formatSteps(week.totalSteps, locale)}
                  </Text>
                  <Text className="mt-1 text-xs font-bold text-muted">
                    {t("Schritte insgesamt", "steps in total")}
                  </Text>
                </View>
                <Text className="pb-1 text-xs font-bold text-muted">
                  {rangeLabel}
                </Text>
              </View>

              <WeekBars week={week} locale={locale} colors={colors} />

              {week.totalSteps === 0 ? (
                <Text className="mt-4 text-center text-xs leading-5 text-muted">
                  {t(
                    "Noch keine Schritte gefunden. Prüfe in Apple Health, ob Zaymax Schritte lesen darf.",
                    "No steps found yet. Check in Apple Health that Zaymax may read your steps.",
                  )}
                </Text>
              ) : null}
            </Animated.View>

            <View className="mt-4 flex-row items-start px-2">
              <IconSymbol name="lock.fill" size={16} color={colors.muted} />
              <Text className="ml-2 flex-1 text-xs leading-5 text-muted">
                {t(
                  "Nur Lesezugriff: Deine Schrittzahlen werden direkt aus Apple Health angezeigt und nicht an Zaymax-Server übertragen.",
                  "Read-only access: Your step counts are displayed directly from Apple Health and are not sent to Zaymax servers.",
                )}
              </Text>
            </View>
            {lastUpdated ? (
              <Text className="mt-3 text-center text-[10px] font-bold uppercase tracking-[1.5px] text-muted">
                {t("AKTUALISIERT", "UPDATED")} ·{" "}
                {new Intl.DateTimeFormat(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(lastUpdated)}
              </Text>
            ) : null}
          </>
        ) : (
          <ConnectionCard
            status={status}
            colors={colors}
            onConnect={() => void connectAppleHealth()}
            t={t}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function WeekBars({
  week,
  locale,
  colors,
}: {
  week: StepWeek;
  locale: AppLocale;
  colors: any;
}) {
  const maxSteps = Math.max(
    DAILY_STEP_GOAL,
    ...week.days.map((day) => day.steps),
  );

  return (
    <View
      className="mt-7 flex-row items-end justify-between"
      style={{ height: 164 }}
    >
      {week.days.map((day) => {
        const height = Math.max(8, Math.round((day.steps / maxSteps) * 110));
        return (
          <View key={day.date.toISOString()} className="flex-1 items-center">
            <Text
              style={{
                marginBottom: 7,
                color: day.isToday ? colors.primary : colors.muted,
                fontSize: 9,
                fontWeight: "800",
              }}
            >
              {formatCompactSteps(day.steps, locale)}
            </Text>
            <View
              style={{
                width: 18,
                height,
                minHeight: 8,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                backgroundColor: day.isToday ? colors.primary : colors.border,
              }}
            />
            <Text
              style={{
                marginTop: 9,
                color: day.isToday ? colors.primary : colors.muted,
                fontSize: 10,
                fontWeight: "900",
                textTransform: "uppercase",
              }}
            >
              {new Intl.DateTimeFormat(locale, { weekday: "short" })
                .format(day.date)
                .replace(".", "")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ConnectionCard({
  status,
  colors,
  onConnect,
  t,
}: {
  status: StepStatus;
  colors: any;
  onConnect: () => void;
  t: (german: string, english: string) => string;
}) {
  const loading = status === "checking" || status === "loading";
  const unavailable = status === "unavailable";
  const error = status === "error";

  return (
    <View
      style={{
        minHeight: 340,
        position: "relative",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: ZAYMAX_DESIGN.radius.hero,
        backgroundColor: "transparent",
        padding: 24,
      }}
    >
      <GlassMaterial raised intensity={30} radius={ZAYMAX_DESIGN.radius.hero} />
      <View
        style={{
          width: 86,
          height: 86,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: ZAYMAX_DESIGN.radius.round,
          backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <IconSymbol name="shoeprints.fill" size={38} color={colors.primary} />
        )}
      </View>
      <Text className="mt-6 text-center text-2xl font-black text-foreground">
        {loading
          ? t("Schritte werden geladen", "Loading steps")
          : unavailable
            ? t("Apple Health nicht verfügbar", "Apple Health unavailable")
            : error
              ? t("Verbindung nicht möglich", "Unable to connect")
              : t("Mit Apple Health verbinden", "Connect Apple Health")}
      </Text>
      <Text className="mt-3 text-center text-sm leading-6 text-muted">
        {loading
          ? t("Einen Moment bitte …", "One moment …")
          : unavailable
            ? t(
                "Die Schrittanzeige ist auf einem echten iPhone mit Apple Health verfügbar.",
                "Step tracking is available on a real iPhone with Apple Health.",
              )
            : error
              ? t(
                  "HealthKit fehlt in diesem installierten Build oder konnte nicht geöffnet werden. Installiere den nächsten Zaymax-iPhone-Build und versuche es erneut.",
                  "HealthKit is missing from this installed build or could not be opened. Install the next Zaymax iPhone build and try again.",
                )
              : t(
                  "Erlaube Zaymax, deine Schrittzahl zu lesen. Die App verändert keine Daten in Apple Health.",
                  "Allow Zaymax to read your step count. The app never changes data in Apple Health.",
                )}
      </Text>
      {!loading && !unavailable ? (
        <Pressable
          accessibilityRole="button"
          onPress={onConnect}
          style={({ pressed }) => ({
            width: "100%",
            minHeight: 54,
            marginTop: 24,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: ZAYMAX_DESIGN.radius.round,
            backgroundColor: ZAYMAX_DESIGN.colors.action,
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <Text className="font-black text-background">
            {error
              ? t("Erneut versuchen", "Try again")
              : t("Apple Health verbinden", "Connect Apple Health")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function formatSteps(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatCompactSteps(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatShortDate(date: Date, language: AppLanguage) {
  return new Intl.DateTimeFormat(appLocaleForLanguage(language), {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}
