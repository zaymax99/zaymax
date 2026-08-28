import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { GlassMaterial } from "@/components/glass-material";
import { ProfileForm } from "@/components/profile-form";
import { KeyboardDismissButton } from "@/components/keyboard-dismiss-button";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { hapticSuccess, hapticTap, hapticWarning } from "@/lib/haptics";
import { useLanguage } from "@/lib/i18n";
import {
  BIRTHDAY_CELEBRATION_KEY,
  isBirthdayToday,
  loadProfile,
  saveProfile,
  type UserProfile,
} from "@/lib/profile";
import { loadActiveSession, loadWorkouts } from "@/lib/workouts";

const CONFETTI_COLORS = [
  ZAYMAX_DESIGN.colors.action,
  ZAYMAX_DESIGN.colors.gold,
  "#B8B8BE",
  ZAYMAX_DESIGN.colors.goldBright,
];

export function AppExperienceOverlay() {
  const colors = useColors("dark");
  const { t } = useLanguage();
  const pathname = usePathname();
  const isActiveWorkout = pathname.startsWith("/workout/active/");
  const isActiveWorkoutRef = useRef(isActiveWorkout);
  isActiveWorkoutRef.current = isActiveWorkout;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBirthday, setShowBirthday] = useState(false);
  const profileSaveRef = useRef(false);
  const birthdayCheckRef = useRef(false);

  const maybeOpenBirthday = useCallback(async (nextProfile: UserProfile) => {
    if (isActiveWorkoutRef.current) return;
    if (!isBirthdayToday(nextProfile.birthDate)) return;
    if (birthdayCheckRef.current) return;
    birthdayCheckRef.current = true;
    try {
      const token = `${new Date().getFullYear()}-${nextProfile.birthDate}`;
      const lastToken = await AsyncStorage.getItem(BIRTHDAY_CELEBRATION_KEY);
      if (lastToken === token) return;
      await AsyncStorage.setItem(BIRTHDAY_CELEBRATION_KEY, token);
      hapticSuccess();
      setShowBirthday(true);
    } catch {
      // A celebration must never block normal app use.
    } finally {
      birthdayCheckRef.current = false;
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadProfile(), loadActiveSession(), loadWorkouts()])
      .then(async ([loaded, activeSession, workouts]) => {
        setProfile(loaded);
        const hasValidActiveWorkout = workouts.some(
          (workout) => workout.id === activeSession?.workoutId,
        );
        if (hasValidActiveWorkout || isActiveWorkoutRef.current) return;
        if (!loaded.onboardingCompleted) {
          setShowOnboarding(true);
          return;
        }
        await maybeOpenBirthday(loaded);
      })
      .catch(() => {
        // Leave overlays closed if profile storage cannot be read.
      });
  }, [maybeOpenBirthday]);

  useEffect(() => {
    if (isActiveWorkout) {
      setShowOnboarding(false);
      setShowBirthday(false);
      return;
    }
    if (!profile) return;
    if (!profile.onboardingCompleted) {
      setShowOnboarding(true);
      return;
    }
    void maybeOpenBirthday(profile);
  }, [isActiveWorkout, maybeOpenBirthday, profile]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void loadProfile()
        .then((loaded) => {
          if (loaded.onboardingCompleted) void maybeOpenBirthday(loaded);
        })
        .catch(() => {
          // App resume must remain usable even if profile storage is unavailable.
        });
    });
    return () => subscription.remove();
  }, [maybeOpenBirthday]);

  async function completeOnboarding(
    values: Pick<UserProfile, "weightKg" | "heightCm" | "birthDate">,
  ) {
    if (profileSaveRef.current) return;
    profileSaveRef.current = true;
    try {
      const next = await saveProfile({
        ...profile,
        ...values,
        onboardingCompleted: true,
      });
      setProfile(next);
      setShowOnboarding(false);
      hapticSuccess();
      await maybeOpenBirthday(next);
    } catch {
      showProfileSaveError();
    } finally {
      profileSaveRef.current = false;
    }
  }

  async function skipOnboarding() {
    if (profileSaveRef.current) return;
    profileSaveRef.current = true;
    try {
      const next = await saveProfile({
        ...profile,
        onboardingCompleted: true,
      });
      setProfile(next);
      setShowOnboarding(false);
      hapticTap();
    } catch {
      showProfileSaveError();
    } finally {
      profileSaveRef.current = false;
    }
  }

  function showProfileSaveError() {
    hapticWarning();
    Alert.alert(
      t("Daten nicht gespeichert", "Data not saved", "Nie zapisano danych"),
      t(
        "Bitte versuche es erneut. Deine Eingaben bleiben geöffnet.",
        "Please try again. Your entries will remain open.",
        "Spróbuj ponownie. Wprowadzone dane pozostaną otwarte.",
      ),
    );
  }

  return (
    <>
      <Modal
        visible={showOnboarding}
        transparent
        animationType="fade"
        onRequestClose={() => void skipOnboarding()}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.overlay}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.onboardingScroll}
            contentContainerStyle={styles.onboardingScrollContent}
          >
            <Animated.View
              entering={FadeInDown.duration(280)}
              style={[
                styles.onboardingCard,
                {
                  position: "relative",
                  overflow: "hidden",
                  borderColor: colors.border,
                  backgroundColor: "transparent",
                },
              ]}
            >
              <GlassMaterial
                raised
                intensity={34}
                radius={ZAYMAX_DESIGN.radius.hero}
              />
              <View style={styles.stepPill}>
                <Text
                  style={{
                    color: colors.background,
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  {t("ZAYMAX START", "ZAYMAX START", "START ZAYMAX")}
                </Text>
              </View>
              <Text
                style={[styles.onboardingTitle, { color: colors.foreground }]}
              >
                {t("Schön, dass du da bist.", "Great to have you here.")}
              </Text>
              <Text style={[styles.onboardingText, { color: colors.muted }]}>
                {t(
                  "Mit drei Angaben kann Zaymax deinen BMI anzeigen und deinen Geburtstag mit dir feiern.",
                  "With three details, Zaymax can show your BMI and celebrate your birthday with you.",
                )}
              </Text>
              <ProfileForm
                initialProfile={profile ?? undefined}
                submitLabel={t("Profil speichern", "Save profile")}
                onSubmit={(values) => void completeOnboarding(values)}
              />
              <Pressable
                accessibilityLabel={t(
                  "Onboarding überspringen",
                  "Skip onboarding",
                )}
                onPress={() => void skipOnboarding()}
                style={({ pressed }) => ({
                  minHeight: 44,
                  marginTop: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  opacity: pressed ? 0.55 : 1,
                })}
              >
                <Text style={{ color: colors.muted, fontWeight: "700" }}>
                  {t("Jetzt überspringen", "Skip for now")}
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          <KeyboardDismissButton />
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showBirthday}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBirthday(false)}
      >
        <View
          style={[
            styles.overlay,
            { backgroundColor: ZAYMAX_DESIGN.colors.overlay },
          ]}
        >
          <BirthdayEffects />
          <Animated.View
            entering={FadeInDown.springify().damping(15)}
            style={[
              styles.birthdayCard,
              { position: "relative", overflow: "hidden" },
            ]}
          >
            <GlassMaterial
              raised
              intensity={34}
              radius={ZAYMAX_DESIGN.radius.hero}
            />
            <Text style={styles.birthdayEmoji}>✦</Text>
            <Text style={styles.birthdayEyebrow}>
              {t(
                "ZAYMAX FEIERT DICH",
                "ZAYMAX CELEBRATES YOU",
                "ZAYMAX ŚWIĘTUJE Z TOBĄ",
              )}
            </Text>
            <Text style={styles.birthdayTitle}>
              {t("Alles Gute zum Geburtstag", "Happy Birthday")}
            </Text>
            <Text style={styles.birthdayWish}>
              {t("wünscht dir Zaymax", "from everyone at Zaymax")}
            </Text>
            <Pressable
              accessibilityLabel={t(
                "Geburtstagsgruß schließen",
                "Close birthday greeting",
              )}
              onPress={() => {
                hapticSuccess();
                setShowBirthday(false);
              }}
              style={({ pressed }) => ({
                minHeight: 50,
                marginTop: 24,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: ZAYMAX_DESIGN.radius.round,
                backgroundColor: ZAYMAX_DESIGN.colors.action,
                paddingHorizontal: 28,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text
                style={{
                  color: ZAYMAX_DESIGN.colors.background,
                  fontWeight: "900",
                  letterSpacing: 0.8,
                }}
              >
                {t("FEIERN", "CELEBRATE")}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function BirthdayEffects() {
  return (
    <View
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
      pointerEvents="none"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <FloatingBalloon key={index} index={index} />
      ))}
      {Array.from({ length: 22 }, (_, index) => (
        <FallingConfetti key={index} index={index} />
      ))}
    </View>
  );
}

function FloatingBalloon({ index }: { index: number }) {
  const travel = useSharedValue(0);
  useEffect(() => {
    travel.value = withDelay(
      index * 240,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200 + index * 180 }),
          withTiming(0, { duration: 2200 + index * 180 }),
        ),
        -1,
      ),
    );
  }, [index, travel]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -30 * travel.value },
      { rotate: `${index % 2 ? -6 : 6}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: index % 2 ? undefined : 15 + index * 18,
          right: index % 2 ? 8 + index * 17 : undefined,
          bottom: 90 + index * 105,
          width: 46 - index * 2,
          height: 46 - index * 2,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: ZAYMAX_DESIGN.radius.round,
          borderWidth: 1,
          borderColor: `${CONFETTI_COLORS[index % CONFETTI_COLORS.length]}66`,
          backgroundColor: `${CONFETTI_COLORS[index % CONFETTI_COLORS.length]}18`,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          fontSize: 20,
          fontWeight: "900",
        }}
      >
        ✦
      </Text>
    </Animated.View>
  );
}

function FallingConfetti({ index }: { index: number }) {
  const travel = useSharedValue(0);
  useEffect(() => {
    travel.value = withDelay(
      (index % 8) * 110,
      withRepeat(withTiming(1, { duration: 1800 + (index % 5) * 180 }), -1),
    );
  }, [index, travel]);
  const style = useAnimatedStyle(() => ({
    opacity: travel.value < 0.08 ? travel.value * 12 : 1 - travel.value * 0.35,
    transform: [
      { translateY: 820 * travel.value },
      { rotate: `${360 * travel.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: -18 - (index % 4) * 40,
          left: `${4 + ((index * 17) % 92)}%`,
          width: index % 3 === 0 ? 10 : 7,
          height: index % 3 === 0 ? 10 : 7,
          borderRadius: 999,
          backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ZAYMAX_DESIGN.colors.overlay,
    padding: 20,
  },
  onboardingScroll: {
    width: "100%",
  },
  onboardingScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  onboardingCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: ZAYMAX_DESIGN.radius.hero,
    borderWidth: 1,
    padding: 22,
    ...ZAYMAX_DESIGN.shadow,
  },
  stepPill: {
    alignSelf: "flex-start",
    borderRadius: ZAYMAX_DESIGN.radius.round,
    backgroundColor: ZAYMAX_DESIGN.colors.action,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  onboardingTitle: {
    marginTop: 18,
    fontSize: 29,
    fontWeight: "900",
  },
  onboardingText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  birthdayCard: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
    borderRadius: ZAYMAX_DESIGN.radius.hero,
    borderWidth: 1,
    borderColor: ZAYMAX_DESIGN.colors.goldLine,
    backgroundColor: "transparent",
    paddingHorizontal: 26,
    paddingVertical: 34,
    ...ZAYMAX_DESIGN.shadow,
  },
  birthdayEmoji: {
    color: ZAYMAX_DESIGN.colors.gold,
    fontSize: 58,
  },
  birthdayEyebrow: {
    marginTop: 15,
    color: ZAYMAX_DESIGN.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.4,
  },
  birthdayTitle: {
    marginTop: 14,
    color: ZAYMAX_DESIGN.colors.action,
    fontSize: 33,
    fontStyle: "italic",
    fontWeight: "900",
    lineHeight: 39,
    textAlign: "center",
  },
  birthdayWish: {
    marginTop: 9,
    color: "#96969D",
    fontSize: 18,
    fontStyle: "italic",
    textAlign: "center",
  },
});
