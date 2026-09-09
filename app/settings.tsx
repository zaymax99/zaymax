import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GlassMaterial } from "@/components/glass-material";
import { GlassButton } from "@/components/glass-button";
import { GoldAccent } from "@/components/gold-accent";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import {
  LANGUAGE_STORAGE_KEY,
  useLanguage,
  type AppLanguage,
} from "@/lib/i18n";
import { loadSettings, type WeightUnit } from "@/lib/workouts";
import {
  finishPendingSettingsUpdates,
  runSettingsUpdate,
  updateSettings,
} from "@/lib/settings-updates";
import { useColors } from "@/hooks/use-colors";
import {
  hapticAction,
  hapticSuccess,
  hapticTap,
  hapticWarning,
} from "@/lib/haptics";
import { createBackup, pickBackup, restoreBackup } from "@/lib/backup";
import { dismissAllLockScreenReminders } from "@/lib/lock-screen-reminders";
import { updatePinnedNoteWidget } from "@/lib/lock-screen-widget";
import { getPinnedLockScreenReminder, loadReminders } from "@/lib/reminders";

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

function widgetEmptyLabel(language: AppLanguage) {
  if (language === "de") return "Notiz in Zaymax auswählen";
  if (language === "pl") return "Wybierz notatkę w Zaymax";
  return "Select a note in Zaymax";
}

export default function SettingsScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [restSeconds, setRestSeconds] = useState(90);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [backupBusy, setBackupBusy] = useState(false);
  const backupBusyRef = useRef(false);

  function setDataOperationBusy(busy: boolean) {
    backupBusyRef.current = busy;
    setBackupBusy(busy);
  }

  useFocusEffect(
    useCallback(() => {
      void loadSettings()
        .then((settings) => {
          setRestSeconds(settings.restSeconds);
          setWeightUnit(settings.weightUnit);
        })
        .catch(() => {
          // Keep the last visible values; actions below report write failures.
        });
    }, []),
  );

  async function chooseRest(seconds: number) {
    if (backupBusyRef.current) return;
    try {
      await updateSettings({ restSeconds: seconds });
      setRestSeconds(seconds);
      hapticTap();
    } catch {
      showSettingsSaveError();
    }
  }

  async function chooseUnit(unit: WeightUnit) {
    if (backupBusyRef.current) return;
    try {
      await updateSettings({ weightUnit: unit });
      setWeightUnit(unit);
      hapticTap();
    } catch {
      showSettingsSaveError();
    }
  }

  async function chooseLanguage(nextLanguage: AppLanguage) {
    if (backupBusyRef.current) return;
    try {
      await runSettingsUpdate(async () => {
        await setLanguage(nextLanguage);
        const notes = await loadReminders();
        await updatePinnedNoteWidget(
          getPinnedLockScreenReminder(notes)?.text,
          widgetEmptyLabel(nextLanguage),
        );
      });
      hapticTap();
    } catch {
      showSettingsSaveError();
    }
  }

  function showSettingsSaveError() {
    hapticWarning();
    Alert.alert(
      t(
        "Einstellung nicht gespeichert",
        "Setting not saved",
        "Nie zapisano ustawienia",
      ),
      t(
        "Bitte versuche es erneut. Deine bisherige Einstellung bleibt erhalten.",
        "Please try again. Your previous setting remains unchanged.",
        "Spróbuj ponownie. Poprzednie ustawienie pozostaje bez zmian.",
      ),
    );
  }

  async function exportData() {
    if (backupBusyRef.current) return;
    hapticAction();
    setDataOperationBusy(true);
    try {
      await finishPendingSettingsUpdates();
      const fileName = await createBackup();
      hapticSuccess();
      Alert.alert(
        t("Backup erstellt", "Backup created"),
        t(
          `${fileName} enthält deine lokalen Zaymax-Daten. Bewahre die Datei sicher auf.`,
          `${fileName} contains your local Zaymax data. Keep the file somewhere safe.`,
          `${fileName} zawiera Twoje lokalne dane Zaymax. Przechowuj plik w bezpiecznym miejscu.`,
        ),
      );
    } catch {
      hapticWarning();
      Alert.alert(
        t("Backup nicht möglich", "Could not create backup"),
        t(
          "Die Backup-Datei konnte nicht gespeichert oder geteilt werden.",
          "The backup file could not be saved or shared.",
        ),
      );
    } finally {
      setDataOperationBusy(false);
    }
  }

  async function importData() {
    if (backupBusyRef.current) return;
    hapticAction();
    setDataOperationBusy(true);
    try {
      const backup = await pickBackup();
      if (!backup) {
        setDataOperationBusy(false);
        return;
      }
      let restorationStarted = false;
      Alert.alert(
        t("Backup wiederherstellen?", "Restore backup?"),
        t(
          "Deine aktuellen lokalen Daten werden durch den Inhalt dieser Datei ersetzt.",
          "Your current local data will be replaced with the contents of this file.",
        ),
        [
          {
            text: t("Abbrechen", "Cancel"),
            style: "cancel",
            onPress: () => {
              hapticTap();
              setDataOperationBusy(false);
            },
          },
          {
            text: t("Wiederherstellen", "Restore"),
            onPress: async () => {
              restorationStarted = true;
              try {
                await finishPendingSettingsUpdates();
                await restoreBackup(backup);
                await dismissAllLockScreenReminders().catch(() => undefined);
                const restoredNotes = await loadReminders();
                const savedLanguage = backup.data[LANGUAGE_STORAGE_KEY];
                const restoredLanguage: AppLanguage =
                  savedLanguage === "en" || savedLanguage === "pl"
                    ? savedLanguage
                    : "de";
                await setLanguage(restoredLanguage);
                await updatePinnedNoteWidget(
                  getPinnedLockScreenReminder(restoredNotes)?.text,
                  widgetEmptyLabel(restoredLanguage),
                );
                hapticSuccess();
                router.replace("/");
                Alert.alert(
                  t("Backup geladen", "Backup restored"),
                  t(
                    "Deine lokalen Daten wurden wiederhergestellt.",
                    "Your local data has been restored.",
                  ),
                );
              } catch {
                hapticWarning();
                Alert.alert(
                  t("Wiederherstellung fehlgeschlagen", "Restore failed"),
                  t(
                    "Die Daten konnten nicht wiederhergestellt werden.",
                    "The data could not be restored.",
                  ),
                );
              } finally {
                setDataOperationBusy(false);
              }
            },
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            if (!restorationStarted) setDataOperationBusy(false);
          },
        },
      );
    } catch {
      setDataOperationBusy(false);
      hapticWarning();
      Alert.alert(
        t("Ungültige Backup-Datei", "Invalid backup file"),
        t(
          "Bitte wähle eine gültige Zaymax-Backup-Datei aus.",
          "Please select a valid Zaymax backup file.",
        ),
      );
    }
  }

  function clearData() {
    if (backupBusyRef.current) return;
    setDataOperationBusy(true);
    let deletionStarted = false;
    hapticWarning();
    Alert.alert(
      t("Alle Daten löschen?", "Delete all data?"),
      t(
        "Workouts, Historie, Tagebuch, Session und Einstellungen werden entfernt.",
        "Workouts, history, journal, active session and settings will be removed.",
      ),
      [
        {
          text: t("Abbrechen", "Cancel"),
          style: "cancel",
          onPress: () => setDataOperationBusy(false),
        },
        {
          text: t("Löschen", "Delete"),
          style: "destructive",
          onPress: async () => {
            deletionStarted = true;
            try {
              await finishPendingSettingsUpdates();
              const allKeys = await AsyncStorage.getAllKeys();
              const zaymaxKeys = allKeys.filter((key) =>
                key.startsWith("zaymax."),
              );
              if (zaymaxKeys.length) await AsyncStorage.multiRemove(zaymaxKeys);
              await dismissAllLockScreenReminders().catch(() => undefined);
              await updatePinnedNoteWidget(undefined, widgetEmptyLabel("de"));
              await setLanguage("de");
              hapticSuccess();
              Alert.alert(
                t("Erledigt", "Done"),
                t(
                  "Deine lokalen Daten wurden gelöscht.",
                  "Your local data has been deleted.",
                ),
              );
              router.replace("/");
            } catch {
              hapticWarning();
              Alert.alert(
                t(
                  "Daten nicht vollständig gelöscht",
                  "Data not fully deleted",
                  "Dane nie zostały całkowicie usunięte",
                ),
                t(
                  "Bitte versuche es erneut.",
                  "Please try again.",
                  "Spróbuj ponownie.",
                ),
              );
            } finally {
              setDataOperationBusy(false);
            }
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          if (!deletionStarted) setDataOperationBusy(false);
        },
      },
    );
  }

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 34 }}
      >
        <View className="flex-row items-start pt-3 pb-7">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-black uppercase tracking-[3px] text-muted">
                ZAYMAX / SYSTEM
              </Text>
              <GoldAccent />
            </View>
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

        <GlassButton
          accessibilityRole="button"
          accessibilityLabel={t("Zurück zu Heute", "Back to Today")}
          onPress={() => {
            hapticTap();
            router.replace("/");
          }}
          style={{ marginBottom: 16 }}
          surfaceStyle={{
            minHeight: 50,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconSymbol name="house.fill" size={18} color={colors.foreground} />
          <Text className="ml-2 font-black tracking-[0.4px] text-foreground">
            {t("Zurück zu Heute", "Back to Today")}
          </Text>
        </GlassButton>

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
                  accessibilityState={{ checked: active, disabled: backupBusy }}
                  accessibilityLabel={option.accessibilityLabel}
                  disabled={backupBusy}
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
                  disabled={backupBusy}
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
                  disabled={backupBusy}
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
                  backgroundColor: ZAYMAX_DESIGN.colors.action,
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
          onPress={() => {
            hapticTap();
            router.push("/privacy" as Href);
          }}
          style={({ pressed }) => [
            {
              marginTop: 14,
              minHeight: 82,
              flexDirection: "row",
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "transparent",
              padding: ZAYMAX_DESIGN.spacing.card,
              borderRadius: ZAYMAX_DESIGN.radius.card,
              ...ZAYMAX_DESIGN.shadow,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <GlassMaterial intensity={22} />
          <View
            style={{
              width: 46,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: ZAYMAX_DESIGN.radius.round,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
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
          disabled={backupBusy}
          onPress={clearData}
          style={({ pressed }) => [
            {
              marginTop: 14,
              borderWidth: 1,
              borderColor: ZAYMAX_DESIGN.colors.danger,
              backgroundColor: ZAYMAX_DESIGN.colors.dangerSoft,
              padding: ZAYMAX_DESIGN.spacing.card,
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
          position: "relative",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: "transparent",
          padding: ZAYMAX_DESIGN.spacing.card,
          borderRadius: ZAYMAX_DESIGN.radius.card,
          ...ZAYMAX_DESIGN.shadow,
        },
        style,
      ]}
    >
      <GlassMaterial intensity={25} />
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
