import { useEffect, useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { useLanguage, usesDecimalComma } from "@/lib/i18n";
import {
  formatBirthDate,
  parseBirthDateInput,
  parseDecimalInput,
  type UserProfile,
} from "@/lib/profile";

export function ProfileForm({
  initialProfile,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialProfile?: Partial<UserProfile>;
  submitLabel: string;
  onSubmit: (
    profile: Pick<UserProfile, "weightKg" | "heightCm" | "birthDate">,
  ) => void;
  onCancel?: () => void;
}) {
  const colors = useColors("dark");
  const { language, locale, t } = useLanguage();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setWeight(
      initialProfile?.weightKg
        ? String(initialProfile.weightKg).replace(
            ".",
            usesDecimalComma(language) ? "," : ".",
          )
        : "",
    );
    setHeight(
      initialProfile?.heightCm
        ? String(initialProfile.heightCm).replace(
            ".",
            usesDecimalComma(language) ? "," : ".",
          )
        : "",
    );
    setBirthday(
      initialProfile?.birthDate
        ? formatBirthDate(initialProfile.birthDate, locale)
        : "",
    );
  }, [initialProfile, language, locale]);

  function submit() {
    const weightKg = parseDecimalInput(weight);
    const heightCm = parseDecimalInput(height);
    const birthDate = parseBirthDateInput(birthday);
    if (weightKg < 20 || weightKg > 500) {
      setError(
        t(
          "Bitte gib ein gültiges Gewicht ein.",
          "Please enter a valid weight.",
        ),
      );
      return;
    }
    if (heightCm < 80 || heightCm > 250) {
      setError(
        t("Bitte gib eine gültige Größe ein.", "Please enter a valid height."),
      );
      return;
    }
    if (!birthDate) {
      setError(
        t(
          "Bitte gib deinen Geburtstag als TT.MM.JJJJ ein.",
          "Please enter your birthday as DD.MM.YYYY.",
        ),
      );
      return;
    }
    setError("");
    Keyboard.dismiss();
    onSubmit({ weightKg, heightCm, birthDate });
  }

  return (
    <View>
      <ProfileField
        label={t("Wie viel wiegst du?", "How much do you weigh?")}
        suffix="kg"
        value={weight}
        onChangeText={setWeight}
        placeholder="75,5"
        colors={colors}
      />
      <ProfileField
        label={t("Wie groß bist du?", "How tall are you?")}
        suffix="cm"
        value={height}
        onChangeText={setHeight}
        placeholder="180"
        colors={colors}
      />
      <ProfileField
        label={t("Wann hast du Geburtstag?", "When is your birthday?")}
        value={birthday}
        onChangeText={(value) => setBirthday(formatBirthdayDraft(value))}
        placeholder={t("TT.MM.JJJJ", "DD.MM.YYYY")}
        colors={colors}
        birthday
      />
      {error ? (
        <Text style={{ marginTop: 12, color: colors.error, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
      <Pressable
        onPress={submit}
        style={({ pressed }) => ({
          minHeight: 50,
          marginTop: 18,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          backgroundColor: colors.primary,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <Text
          style={{
            color: colors.background,
            fontSize: 14,
            fontWeight: "900",
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {submitLabel}
        </Text>
      </Pressable>
      {onCancel ? (
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => ({
            minHeight: 44,
            marginTop: 5,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <Text style={{ color: colors.muted, fontWeight: "700" }}>
            {t("Abbrechen", "Cancel")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function formatBirthdayDraft(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function ProfileField({
  label,
  suffix,
  value,
  onChangeText,
  placeholder,
  colors,
  birthday = false,
}: {
  label: string;
  suffix?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: any;
  birthday?: boolean;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          marginBottom: 7,
          color: colors.muted,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={birthday ? "number-pad" : "decimal-pad"}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          maxLength={birthday ? 10 : 6}
          style={{
            minHeight: 50,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: 15,
            paddingRight: suffix ? 52 : 15,
            color: colors.foreground,
            fontSize: 17,
            fontWeight: "800",
          }}
        />
        {suffix ? (
          <Text
            pointerEvents="none"
            style={{
              position: "absolute",
              right: 15,
              top: 16,
              color: colors.muted,
              fontSize: 13,
              fontWeight: "800",
            }}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
