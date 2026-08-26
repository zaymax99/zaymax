import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import {
  LANGUAGE_STORAGE_KEY,
  useLanguage,
  type AppLanguage,
} from "@/lib/i18n";
import { loadSettings, saveSettings, type WeightUnit } from "@/lib/workouts";
import { useColors } from "@/hooks/use-colors";
import { createBackup, pickBackup, restoreBackup } from "@/lib/backup";

const restOptions = [30, 60, 90, 120, 180];
const languageOptions: {
  value: AppLanguage;
  label: string;
  accessibilityLabel: string;
}[] = [
  { value: "de", label: "DEUTSCH", accessibilityLabel: "Deutsch" },
  { value: "en", label: "ENGLISH", accessibilityLabel: "English" },
  { value: "pl", label: "POLSKI", accessibilityLabel: "Polski" },
];

function formatRest(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} min`;
}

export default function SettingsScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [restSeconds, setRestSeconds] = useState(90);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [backupBusy, setBackupBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((settings) => {
        setRestSeconds(settings.restSeconds);
        setWeightUnit(settings.weightUnit);
      });
    }, []),
  );

  async function chooseRest(seconds: number) {
    const current = await loadSettings();
    setRestSeconds(seconds);
    await saveSettings({ ...current, restSeconds: seconds });
    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function chooseUnit(unit: WeightUnit) {
    const current = await loadSettings();
    setWeightUnit(unit);
    await saveSettings({ ...current, weightUnit: unit });
    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function chooseLanguage(nextLanguage: AppLanguage) {
    await setLanguage(nextLanguage);
    if (Platform.OS !== "web")
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function exportData() {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const fileName = await createBackup();
      Alert.alert(
        t("Backup erstellt", "Backup created"),
        t(
          `${fileName} enthält deine lokalen Zaymax-Daten. Bewahre die Datei sicher auf.`,
          `${fileName} contains your local Zaymax data. Keep the file somewhere safe.`,
          `${fileName} zawiera Twoje lokalne dane Zaymax. Przechowuj plik w bezpiecznym miejscu.`,
        ),
      );
    } catch {
      Alert.alert(
        t("Backup nicht möglich", "Could not create backup"),
        t(
          "Die Backup-Datei konnte nicht gespeichert oder geteilt werden.",
          "The backup file could not be saved or shared.",
        ),
      );
    } finally {
      setBackupBusy(false);
    }
  }

  async function importData() {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const backup = await pickBackup();
      if (!backup) return;
      Alert.alert(
        t("Backup wiederherstellen?", "Restore backup?"),
        t(
          "Deine aktuellen lokalen Daten werden durch den Inhalt dieser Datei ersetzt.",
          "Your current local data will be replaced with the contents of this file.",
        ),
        [
          { text: t("Abbrechen", "Cancel"), style: "cancel" },
          {
            text: t("Wiederherstellen", "Restore"),
            onPress: async () => {
              try {
                await restoreBackup(backup);
                const savedLanguage = backup.data[LANGUAGE_STORAGE_KEY];
                const restoredLanguage: AppLanguage =
                  savedLanguage === "en" || savedLanguage === "pl"
                    ? savedLanguage
                    : "de";
                await setLanguage(restoredLanguage);
                router.replace("/");
                Alert.alert(
                  t("Backup geladen", "Backup restored"),
                  t(
                    "Deine lokalen Daten wurden wiederhergestellt.",
                    "Your local data has been restored.",
                  ),
                );
              } catch {
                Alert.alert(
                  t("Wiederherstellung fehlgeschlagen", "Restore failed"),
                  t(
                    "Die Daten konnten nicht wiederhergestellt werden.",
                    "The data could not be restored.",
                  ),
                );
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert(
        t("Ungültige Backup-Datei", "Invalid backup file"),
        t(
          "Bitte wähle eine gültige Zaymax-Backup-Datei aus.",
          "Please select a valid Zaymax backup file.",
        ),
      );
    } finally {
      setBackupBusy(false);
    }
  }

  function clearData() {
    Alert.alert(
      t("Alle Daten löschen?", "Delete all data?"),
      t(
        "Workouts, Historie, Tagebuch, Session und Einstellungen werden entfernt.",
        "Workouts, history, journal, active session and settings will be removed.",
      ),
      [
        { text: t("Abbrechen", "Cancel"), style: "cancel" },
        {
          text: t("Löschen", "Delete"),
          style: "destructive",
          onPress: async () => {
            const allKeys = await AsyncStorage.getAllKeys();
            const zaymaxKeys = allKeys.filter((key) =>
              key.startsWith("zaymax."),
            );
            if (zaymaxKeys.length) await AsyncStorage.multiRemove(zaymaxKeys);
            await setLanguage("de");
            Alert.alert(
              t("Erledigt", "Done"),
              t(
                "Deine lokalen Daten wurden gelöscht.",
                "Your local data has been deleted.",
              ),
            );
            router.replace("/");
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 34 }}
      >
        <View className="flex-row items-start pt-3 pb-7">
          <ZaymaxWatermark />
          <View className="ml-3 flex-1">
            <Text className="text-xs font-black uppercase tracking-[3px] text-muted">
              ZAYMAX / SYSTEM
            </Text>
            <Text className="mt-1 text-3xl font-black text-foreground">
              {t("Einstellungen", "Settings")}
            </Text>
            <Text className="mt-2 text-base text-muted">
              {t(
                "Passe Zaymax an deinen Rhythmus an.",
                "Adjust Zaymax to your rhythm.",
              )}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={t("Zurück zu Heute", "Back to Today")}
          onPress={() => router.replace("/")}
          style={({ pressed }) => [
            {
              marginBottom: 16,
              minHeight: 50,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: ZAYMAX_DESIGN.radius.round,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <IconSymbol name="house.fill" size={18} color={colors.foreground} />
          <Text className="ml-2 font-black tracking-[0.4px] text-foreground">
            {t("Zurück zu Heute", "Back to Today")}
          </Text>
        </Pressable>

        <SettingsPanel
          eyebrow={t("SPRACHE", "LANGUAGE")}
          title={t("App-Sprache", "App language")}
          detail={t(
            "Deutsch bleibt die Standardsprache.",
            "German remains the default language.",
          )}
          colors={colors}
        >
          <View className="mt-5 flex-row gap-2">
            {languageOptions.map((option) => {
              const active = language === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={option.accessibilityLabel}
                  onPress={() => void chooseLanguage(option.value)}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      minHeight: 76,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary
                        : colors.background,
                      borderRadius: ZAYMAX_DESIGN.radius.nested,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.foreground,
                      fontSize: 16,
                      fontWeight: "900",
                      letterSpacing: 1.1,
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={{
                      marginTop: 5,
                      color: active ? colors.background : colors.muted,
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    {active ? t("AKTIV", "ACTIVE") : t("AUSWÄHLEN", "SELECT")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsPanel>

        <SettingsPanel
          eyebrow={t("TRAINING", "TRAINING")}
          title={t("Pausenzeit", "Rest time")}
          detail={t(
            "Wird im aktiven Training verwendet.",
            "Used during an active workout.",
          )}
          value={formatRest(restSeconds)}
          colors={colors}
          style={{ marginTop: 14 }}
        >
          <View className="mt-5 flex-row flex-wrap gap-2">
            {restOptions.map((seconds) => {
              const active = restSeconds === seconds;
              return (
                <Pressable
                  key={seconds}
                  onPress={() => void chooseRest(seconds)}
                  style={({ pressed }) => [
                    {
                      minWidth: 62,
                      flex: 1,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary
                        : colors.background,
                      borderRadius: ZAYMAX_DESIGN.radius.round,
                      paddingVertical: 13,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.foreground,
                      fontWeight: "800",
                    }}
                  >
                    {formatRest(seconds).replace(" min", "")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsPanel>

        <SettingsPanel
          eyebrow={t("EINHEITEN", "UNITS")}
          title={t("Gewichtseinheit", "Weight unit")}
          detail={t(
            "Wird im Editor, Training und Verlauf angezeigt.",
            "Shown in the editor, workout and history.",
          )}
          colors={colors}
          style={{ marginTop: 14 }}
        >
          <View className="mt-5 flex-row gap-2">
            {(["kg", "lbs"] as WeightUnit[]).map((unit) => {
              const active = weightUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => void chooseUnit(unit)}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary
                        : colors.background,
                      borderRadius: ZAYMAX_DESIGN.radius.round,
                      paddingVertical: 14,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.foreground,
                      fontWeight: "900",
                      textTransform: "uppercase",
                    }}
                  >
                    {unit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsPanel>

        <SettingsPanel
          eyebrow={t("DATENSICHERUNG", "DATA BACKUP")}
          title={t("Lokales Backup", "Local backup")}
          detail={t(
            "Speichere alle Zaymax-Daten als Datei oder stelle sie auf einem neuen Handy wieder her.",
            "Save all Zaymax data as a file or restore it on a new phone.",
          )}
          colors={colors}
          style={{ marginTop: 14 }}
        >
          <View className="mt-5 gap-2">
            <Pressable
              accessibilityLabel={t(
                "Backup-Datei erstellen",
                "Create backup file",
              )}
              disabled={backupBusy}
              onPress={() => void exportData()}
              style={({ pressed }) => [
                {
                  minHeight: 50,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  backgroundColor: colors.primary,
                  opacity: backupBusy ? 0.45 : pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text className="font-black tracking-[0.4px] text-background">
                {t("Backup speichern", "Save backup")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t("Backup-Datei laden", "Load backup file")}
              disabled={backupBusy}
              onPress={() => void importData()}
              style={({ pressed }) => [
                {
                  minHeight: 50,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  opacity: backupBusy ? 0.45 : pressed ? 0.62 : 1,
                },
              ]}
            >
              <Text className="font-black tracking-[0.4px] text-foreground">
                {t("Backup laden", "Load backup")}
              </Text>
            </Pressable>
          </View>
        </SettingsPanel>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            "Datenschutz und Hilfe öffnen",
            "Open privacy and help",
          )}
          onPress={() => router.push("/privacy" as Href)}
          style={({ pressed }) => [
            {
              marginTop: 14,
              minHeight: 82,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 20,
              borderRadius: ZAYMAX_DESIGN.radius.card,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 46,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: ZAYMAX_DESIGN.radius.round,
              backgroundColor: colors.background,
            }}
          >
            <IconSymbol name="lock.fill" size={21} color={colors.foreground} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-black text-foreground">
              {t("Datenschutz & Hilfe", "Privacy & help")}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-muted">
              {t(
                "Lokale Daten, Löschung, Backup und Gesundheitshinweise.",
                "Local data, deletion, backup and health notices.",
              )}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={22} color={colors.muted} />
        </Pressable>

        <Pressable
          onPress={clearData}
          style={({ pressed }) => [
            {
              marginTop: 14,
              borderWidth: 1,
              borderColor: `${colors.error}66`,
              backgroundColor: "rgba(223, 133, 133, 0.04)",
              padding: 20,
              borderRadius: ZAYMAX_DESIGN.radius.card,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text className="font-black uppercase tracking-[1px] text-error">
            {t("Alle lokalen Daten löschen", "Delete all local data")}
          </Text>
          <Text className="mt-2 text-sm text-muted">
            {t(
              "Workouts, Historie, Tagebuch und Einstellungen.",
              "Workouts, history, journal and settings.",
            )}
          </Text>
        </Pressable>

        <View className="mt-8 items-center">
          <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
          <Text className="mt-3 text-sm font-bold uppercase tracking-[2px] text-muted">
            {t(
              "Zaymax · Trainingsnotizen",
              "Zaymax · Training Notes",
              "Zaymax · Notatki treningowe",
            )}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingsPanel({
  eyebrow,
  title,
  detail,
  value,
  colors,
  children,
  style,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  value?: string;
  colors: any;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 20,
          borderRadius: ZAYMAX_DESIGN.radius.card,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: 10,
          fontWeight: "900",
          letterSpacing: 2,
        }}
      >
        {eyebrow}
      </Text>
      <View className="mt-2 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-black text-foreground">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{detail}</Text>
        </View>
        {value ? (
          <Text className="text-xl font-black text-foreground">{value}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
