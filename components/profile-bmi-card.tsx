import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { ProfileForm } from "@/components/profile-form";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
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
  low: "#E16868",
  healthy: "#50C878",
  elevated: "#E7B95A",
  high: "#E16868",
};

export function ProfileBmiCard() {
  const colors = useColors("dark");
  const { locale, t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>({
    onboardingCompleted: true,
  });
  const [editVisible, setEditVisible] = useState(false);

  const refresh = useCallback(() => {
    void loadProfile().then(setProfile);
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
    const next = await saveProfile({
      ...profile,
      ...values,
      onboardingCompleted: true,
    });
    setProfile(next);
    setEditVisible(false);
  }

  return (
    <>
      <View
        style={{
          marginBottom: 16,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: `${colors.surface}E8`,
          padding: 20,
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
                textTransform: "uppercase",
              }}
            >
              {t("Deine Übersicht", "Your overview")}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={t("Körperdaten bearbeiten", "Edit body data")}
            onPress={() => setEditVisible(true)}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <IconSymbol name="pencil" size={18} color={colors.foreground} />
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
                borderRadius: 20,
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
                  <Text style={{ fontSize: 25 }}>{bmiEmoji(level)}</Text>
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
                `Geburtstag: ${formatBirthDate(profile.birthDate, locale)} · Der BMI ist ein grober Richtwert.`,
                `Birthday: ${formatBirthDate(profile.birthDate, locale)} · BMI is a general guide.`,
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
              onPress={() => setEditVisible(true)}
              style={({ pressed }) => ({
                minHeight: 46,
                marginTop: 15,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.background,
                  fontWeight: "900",
                  textTransform: "uppercase",
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
            backgroundColor: "rgba(0,0,0,0.9)",
          }}
        >
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 21,
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
        minHeight: 66,
        justifyContent: "center",
        borderRadius: 17,
        backgroundColor: colors.background,
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
            borderRadius: 999,
          }}
        >
          <View style={{ flex: 4.5, backgroundColor: "#E16868" }} />
          <View style={{ flex: 6.5, backgroundColor: "#50C878" }} />
          <View style={{ flex: 5, backgroundColor: "#E7B95A" }} />
          <View style={{ flex: 10, backgroundColor: "#E16868" }} />
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

function bmiEmoji(level: BmiLevel) {
  if (level === "healthy") return "🙂";
  if (level === "elevated") return "😐";
  return "☹️";
}

function formatProfileNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    value,
  );
}

function bmiLabel(level: BmiLevel, t: (de: string, en: string) => string) {
  const labels: Record<BmiLevel, [string, string]> = {
    low: ["Niedriger Bereich", "Low range"],
    healthy: ["Guter Bereich", "Healthy range"],
    elevated: ["Mittlerer Bereich", "Medium range"],
    high: ["Hoher Bereich", "High range"],
  };
  return t(...labels[level]);
}
