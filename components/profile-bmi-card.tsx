import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { ProfileForm } from "@/components/profile-form";
import { KeyboardDismissButton } from "@/components/keyboard-dismiss-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { hapticSuccess, hapticTap, hapticWarning } from "@/lib/haptics";
import { useLanguage } from "@/lib/i18n";
import {
  bmiLevel,
  bmiMarkerPosition,
  calculateAge,
  calculateBmi,
  formatBirthDate,
  loadProfile,
  saveProfile,
  type BmiLevel,
  type UserProfile,
} from "@/lib/profile";

const BMI_COLORS: Record<BmiLevel, string> = {
  low: ZAYMAX_DESIGN.colors.danger,
  healthy: ZAYMAX_DESIGN.colors.success,
  elevated: ZAYMAX_DESIGN.colors.goldBright,
  high: ZAYMAX_DESIGN.colors.danger,
};

export function ProfileBmiCard() {
  const colors = useColors("dark");
  const { locale, t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>({
    onboardingCompleted: true,
  });
  const [editVisible, setEditVisible] = useState(false);
  const profileSaveRef = useRef(false);

  const refresh = useCallback(() => {
    void loadProfile()
      .then(setProfile)
      .catch(() => {
        // Keep the previously loaded profile when local storage is unavailable.
      });
  }, []);
  useFocusEffect(refresh);

  const bmi = useMemo(() => calculateBmi(profile), [profile]);
  const level = bmi === undefined ? undefined : bmiLevel(bmi);
  const isComplete = Boolean(
    profile.weightKg && profile.heightCm && profile.birthDate,
  );

  async function updateProfile(
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
      setEditVisible(false);
      hapticSuccess();
    } catch {
      hapticWarning();
      Alert.alert(
        t(
          "Körperdaten nicht gespeichert",
          "Body data not saved",
          "Nie zapisano danych ciała",
        ),
        t(
          "Deine bisherigen Daten bleiben erhalten. Bitte versuche es erneut.",
          "Your previous data remains unchanged. Please try again.",
          "Poprzednie dane pozostają bez zmian. Spróbuj ponownie.",
        ),
      );
    } finally {
      profileSaveRef.current = false;
    }
  }

  return (
    <>
      <View
        style={{
          marginBottom: 16,
          borderRadius: ZAYMAX_DESIGN.radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 18,
          ...ZAYMAX_DESIGN.shadow,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                color: colors.muted,
                fontSize: 10,
                fontWeight: "900",
                letterSpacing: 2,
              }}
            >
              {t("KÖRPER & BMI", "BODY & BMI")}
            </Text>
            <Text
              style={{
                marginTop: 7,
                color: colors.foreground,
                fontSize: 21,
                fontWeight: "900",
              }}
            >
              {t("Deine Übersicht", "Your overview")}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={t("Körperdaten bearbeiten", "Edit body data")}
            onPress={() => {
              hapticTap();
              setEditVisible(true);
            }}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: ZAYMAX_DESIGN.radius.round,
              borderWidth: 1,
              borderColor: `${colors.primary}60`,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <IconSymbol name="pencil" size={18} color={colors.primary} />
          </Pressable>
        </View>

        {isComplete && bmi !== undefined && level ? (
          <>
            <View style={{ marginTop: 17, flexDirection: "row", gap: 8 }}>
              <ProfileMetric
                label={t("Gewicht", "Weight")}
                value={`${formatProfileNumber(profile.weightKg!, locale)} kg`}
                colors={colors}
              />
              <ProfileMetric
                label={t("Größe", "Height")}
                value={`${formatProfileNumber(profile.heightCm!, locale)} cm`}
                colors={colors}
              />
              <ProfileMetric
                label={t("Alter", "Age")}
                value={`${calculateAge(profile.birthDate) ?? "—"}`}
                colors={colors}
              />
            </View>

            <View
              style={{
                marginTop: 16,
                borderRadius: ZAYMAX_DESIGN.radius.nested,
                backgroundColor: colors.background,
                padding: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 10,
                      fontWeight: "800",
                      letterSpacing: 1.2,
                    }}
                  >
                    BMI
                  </Text>
                  <Text
                    style={{
                      marginTop: 3,
                      color: colors.foreground,
                      fontSize: 32,
                      fontWeight: "900",
                    }}
                  >
                    {bmi}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: ZAYMAX_DESIGN.radius.round,
                      borderWidth: 1,
                      borderColor: BMI_COLORS[level],
                      backgroundColor:
                        level === "healthy"
                          ? ZAYMAX_DESIGN.colors.successSoft
                          : level === "elevated"
                            ? ZAYMAX_DESIGN.colors.goldSoft
                            : ZAYMAX_DESIGN.colors.surfaceRaised,
                    }}
                  >
                    <Text
                      style={{
                        color: BMI_COLORS[level],
                        fontSize: 17,
                        fontWeight: "900",
                      }}
                    >
                      {bmiIndicator(level)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      marginTop: 2,
                      color: BMI_COLORS[level],
                      fontSize: 12,
                      fontWeight: "900",
                    }}
                  >
                    {bmiLabel(level, t)}
                  </Text>
                </View>
              </View>
              <BmiScale bmi={bmi} colors={colors} />
            </View>

            <Text
              style={{
                marginTop: 13,
                color: colors.muted,
                fontSize: 11,
                lineHeight: 16,
              }}
            >
              {t(
                `Geburtstag: ${formatBirthDate(profile.birthDate, locale)} · Der BMI ist ein grober Richtwert, keine medizinische Beratung oder Diagnose.`,
                `Birthday: ${formatBirthDate(profile.birthDate, locale)} · BMI is a general guide, not medical advice or a diagnosis.`,
                `Data urodzenia: ${formatBirthDate(profile.birthDate, locale)} · BMI jest wartością orientacyjną, a nie poradą medyczną ani diagnozą.`,
              )}
            </Text>
          </>
        ) : (
          <View style={{ marginTop: 15 }}>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
              {t(
                "Trage Gewicht, Größe und Geburtstag ein. Daraus erstellt Zaymax deine persönliche Übersicht.",
                "Add weight, height and birthday. Zaymax will turn them into your personal overview.",
              )}
            </Text>
            <Pressable
              onPress={() => {
                hapticTap();
                setEditVisible(true);
              }}
              style={({ pressed }) => ({
                minHeight: 46,
                marginTop: 15,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: ZAYMAX_DESIGN.radius.round,
                backgroundColor: ZAYMAX_DESIGN.colors.action,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.background,
                  fontWeight: "900",
                }}
              >
                {t("Daten eintragen", "Add data")}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 20,
            backgroundColor: ZAYMAX_DESIGN.colors.overlay,
          }}
        >
          <View
            style={{
              borderRadius: ZAYMAX_DESIGN.radius.hero,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 21,
              ...ZAYMAX_DESIGN.shadow,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 10,
                fontWeight: "900",
                letterSpacing: 2,
              }}
            >
              {t("DEIN PROFIL", "YOUR PROFILE")}
            </Text>
            <Text
              style={{
                marginTop: 7,
                color: colors.foreground,
                fontSize: 26,
                fontWeight: "900",
              }}
            >
              {t("Körperdaten", "Body data")}
            </Text>
            <ProfileForm
              initialProfile={profile}
              submitLabel={t("Daten speichern", "Save data")}
              onSubmit={(values) => void updateProfile(values)}
              onCancel={() => setEditVisible(false)}
            />
          </View>
          <KeyboardDismissButton />
        </View>
      </Modal>
    </>
  );
}

function ProfileMetric({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 62,
        justifyContent: "center",
        borderRadius: ZAYMAX_DESIGN.radius.input,
        backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "800" }}>
        {label.toUpperCase()}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 5,
          color: colors.foreground,
          fontSize: 14,
          fontWeight: "900",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function BmiScale({ bmi, colors }: { bmi: number; colors: any }) {
  const { t } = useLanguage();
  const marker = bmiMarkerPosition(bmi);
  return (
    <View style={{ marginTop: 15 }}>
      <View style={{ height: 20, justifyContent: "flex-end" }}>
        <View
          style={{
            height: 11,
            flexDirection: "row",
            overflow: "hidden",
            borderRadius: ZAYMAX_DESIGN.radius.round,
          }}
        >
          <View style={{ flex: 4.5, backgroundColor: colors.border }} />
          <View
            style={{ flex: 6.5, backgroundColor: ZAYMAX_DESIGN.colors.success }}
          />
          <View
            style={{ flex: 5, backgroundColor: ZAYMAX_DESIGN.colors.goldLine }}
          />
          <View style={{ flex: 10, backgroundColor: colors.muted }} />
        </View>
        <View
          style={{
            position: "absolute",
            left: `${marker}%`,
            top: 0,
            marginLeft: -6,
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 8,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: colors.foreground,
          }}
        />
      </View>
      <View
        style={{
          marginTop: 5,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 9 }}>
          {t("Niedrig", "Low")}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 9 }}>
          {t("Gut", "Good")}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 9 }}>
          {t("Mittel", "Medium")}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 9 }}>
          {t("Hoch", "High")}
        </Text>
      </View>
    </View>
  );
}

function bmiIndicator(level: BmiLevel) {
  if (level === "healthy") return "✓";
  if (level === "elevated") return "–";
  return "!";
}

function formatProfileNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    value,
  );
}

function bmiLabel(
  level: BmiLevel,
  t: (de: string, en: string, pl?: string) => string,
) {
  const labels: Record<BmiLevel, [string, string, string]> = {
    low: ["Niedriger Bereich", "Low range", "Niski zakres"],
    healthy: ["Guter Bereich", "Healthy range", "Dobry zakres"],
    elevated: ["Mittlerer Bereich", "Medium range", "Średni zakres"],
    high: ["Hoher Bereich", "High range", "Wysoki zakres"],
  };
  return t(...labels[level]);
}
