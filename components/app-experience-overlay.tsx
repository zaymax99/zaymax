import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
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

import { ProfileForm } from "@/components/profile-form";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";
import {
  BIRTHDAY_CELEBRATION_KEY,
  isBirthdayToday,
  loadProfile,
  saveProfile,
  type UserProfile,
} from "@/lib/profile";

const CONFETTI_COLORS = ["#FF4F81", "#FFD166", "#4FD1C5", "#8B7CFF", "#64B5F6"];

export function AppExperienceOverlay() {
  const colors = useColors("dark");
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBirthday, setShowBirthday] = useState(false);

  const maybeOpenBirthday = useCallback(async (nextProfile: UserProfile) => {
    if (!isBirthdayToday(nextProfile.birthDate)) return;
    const token = `${new Date().getFullYear()}-${nextProfile.birthDate}`;
    const lastToken = await AsyncStorage.getItem(BIRTHDAY_CELEBRATION_KEY);
    if (lastToken === token) return;
    await AsyncStorage.setItem(BIRTHDAY_CELEBRATION_KEY, token);
    setShowBirthday(true);
  }, []);

  useEffect(() => {
    void loadProfile().then(async (loaded) => {
      setProfile(loaded);
      if (!loaded.onboardingCompleted) {
        setShowOnboarding(true);
        return;
      }
      await maybeOpenBirthday(loaded);
    });
  }, [maybeOpenBirthday]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void loadProfile().then((loaded) => {
        if (loaded.onboardingCompleted) void maybeOpenBirthday(loaded);
      });
    });
    return () => subscription.remove();
  }, [maybeOpenBirthday]);

  async function completeOnboarding(
    values: Pick<UserProfile, "weightKg" | "heightCm" | "birthDate">,
  ) {
    const next = await saveProfile({
      ...profile,
      ...values,
      onboardingCompleted: true,
    });
    setProfile(next);
    setShowOnboarding(false);
    await maybeOpenBirthday(next);
  }

  async function skipOnboarding() {
    const next = await saveProfile({
      ...profile,
      onboardingCompleted: true,
    });
    setProfile(next);
    setShowOnboarding(false);
  }

  return (
    <>
      <Modal
        visible={showOnboarding}
        transparent
        animationType="fade"
        onRequestClose={() => void skipOnboarding()}
      >
        <View style={styles.overlay}>
          <Animated.View
            entering={FadeInDown.duration(280)}
            style={[
              styles.onboardingCard,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <View style={styles.stepPill}>
              <Text
                style={{
                  color: colors.background,
                  fontSize: 10,
                  fontWeight: "900",
                }}
              >
                ZAYMAX START
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
                borderRadius: 999,
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <Text style={{ color: colors.muted, fontWeight: "700" }}>
                {t("Jetzt überspringen", "Skip for now")}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showBirthday}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBirthday(false)}
      >
        <View style={[styles.overlay, { backgroundColor: "rgba(7,7,9,0.94)" }]}>
          <BirthdayEffects />
          <Animated.View
            entering={FadeInDown.springify().damping(15)}
            style={styles.birthdayCard}
          >
            <Text style={styles.birthdayEmoji}>🎂</Text>
            <Text style={styles.birthdayEyebrow}>ZAYMAX CELEBRATES YOU</Text>
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
              onPress={() => setShowBirthday(false)}
              style={({ pressed }) => ({
                minHeight: 50,
                marginTop: 24,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 28,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text
                style={{
                  color: "#111114",
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
      {["🎈", "🎈", "🎈", "🎈"].map((balloon, index) => (
        <FloatingBalloon key={index} index={index} balloon={balloon} />
      ))}
      {Array.from({ length: 22 }, (_, index) => (
        <FallingConfetti key={index} index={index} />
      ))}
    </View>
  );
}

function FloatingBalloon({
  index,
  balloon,
}: {
  index: number;
  balloon: string;
}) {
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
    <Animated.Text
      style={[
        {
          position: "absolute",
          left: index % 2 ? undefined : 15 + index * 18,
          right: index % 2 ? 8 + index * 17 : undefined,
          bottom: 90 + index * 105,
          fontSize: 52 - index * 3,
        },
        style,
      ]}
    >
      {balloon}
    </Animated.Text>
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
    backgroundColor: "rgba(0,0,0,0.9)",
    padding: 20,
  },
  onboardingCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "94%",
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
  },
  stepPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#EEEEF0",
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
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(28,25,38,0.95)",
    paddingHorizontal: 26,
    paddingVertical: 34,
  },
  birthdayEmoji: { fontSize: 58 },
  birthdayEyebrow: {
    marginTop: 15,
    color: "#FFD166",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.4,
  },
  birthdayTitle: {
    marginTop: 14,
    color: "#FFFFFF",
    fontSize: 33,
    fontStyle: "italic",
    fontWeight: "900",
    lineHeight: 39,
    textAlign: "center",
  },
  birthdayWish: {
    marginTop: 9,
    color: "#D8D4E5",
    fontSize: 18,
    fontStyle: "italic",
    textAlign: "center",
  },
});
