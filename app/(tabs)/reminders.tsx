import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { GlassMaterial } from "@/components/glass-material";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProfileBmiCard } from "@/components/profile-bmi-card";
import { ZaymaxWordmark } from "@/components/zaymax-wordmark";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import {
  hapticSelection,
  hapticSuccess,
  hapticTap,
  hapticWarning,
} from "@/lib/haptics";
import { useLanguage } from "@/lib/i18n";
import { dismissLockScreenReminder } from "@/lib/lock-screen-reminders";
import { updatePinnedNoteWidget } from "@/lib/lock-screen-widget";
import {
  getPinnedLockScreenReminder,
  loadReminders,
  loadTrainingDays,
  reminderUid,
  saveReminders,
  saveTrainingDays,
  selectLockScreenReminder,
  type Reminder,
  type Weekday,
} from "@/lib/reminders";

const WEEKDAYS: {
  value: Weekday;
  de: string;
  en: string;
  pl: string;
  deShort: string;
  enShort: string;
  plShort: string;
}[] = [
  {
    value: "monday",
    de: "Montag",
    en: "Monday",
    pl: "Poniedziałek",
    deShort: "Mo",
    enShort: "Mon",
    plShort: "Pon",
  },
  {
    value: "tuesday",
    de: "Dienstag",
    en: "Tuesday",
    pl: "Wtorek",
    deShort: "Di",
    enShort: "Tue",
    plShort: "Wt",
  },
  {
    value: "wednesday",
    de: "Mittwoch",
    en: "Wednesday",
    pl: "Środa",
    deShort: "Mi",
    enShort: "Wed",
    plShort: "Śr",
  },
  {
    value: "thursday",
    de: "Donnerstag",
    en: "Thursday",
    pl: "Czwartek",
    deShort: "Do",
    enShort: "Thu",
    plShort: "Czw",
  },
  {
    value: "friday",
    de: "Freitag",
    en: "Friday",
    pl: "Piątek",
    deShort: "Fr",
    enShort: "Fri",
    plShort: "Pt",
  },
  {
    value: "saturday",
    de: "Samstag",
    en: "Saturday",
    pl: "Sobota",
    deShort: "Sa",
    enShort: "Sat",
    plShort: "Sob",
  },
  {
    value: "sunday",
    de: "Sonntag",
    en: "Sunday",
    pl: "Niedziela",
    deShort: "So",
    enShort: "Sun",
    plShort: "Ndz",
  },
];

export default function JournalScreen() {
  const colors = useColors("dark");
  const { locale, t } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [trainingDays, setTrainingDays] = useState<Weekday[]>([]);
  const [pendingDays, setPendingDays] = useState<Weekday[]>([]);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(0);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lockScreenBusyId, setLockScreenBusyId] = useState<string | null>(null);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingDraftRef = useRef(false);

  const refresh = useCallback(async () => {
    const [notes, days] = await Promise.all([
      loadReminders(),
      loadTrainingDays(),
    ]);
    const legacyNotifications = notes.filter(
      (note) => note.lockScreenNotificationId,
    );
    const preferredPinnedId =
      getPinnedLockScreenReminder(notes)?.id ?? legacyNotifications[0]?.id;
    const visibleNotes = legacyNotifications.length
      ? selectLockScreenReminder(notes, preferredPinnedId ?? null)
      : notes;

    if (legacyNotifications.length) {
      await Promise.allSettled(
        legacyNotifications.map((note) =>
          dismissLockScreenReminder(note.lockScreenNotificationId!),
        ),
      );
      await saveReminders(visibleNotes);
    }

    await updatePinnedNoteWidget(
      getPinnedLockScreenReminder(visibleNotes)?.text,
      t(
        "Notiz in Zaymax auswählen",
        "Select a note in Zaymax",
        "Wybierz notatkę w Zaymax",
      ),
    );
    setReminders(visibleNotes);
    setTrainingDays(days);
  }, [t]);
  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        // Keep the last rendered journal instead of producing an unhandled error.
      });
    }, [refresh]),
  );
  useEffect(
    () => () => {
      if (confettiTimer.current) clearTimeout(confettiTimer.current);
    },
    [],
  );

  function beginEdit(reminder: Reminder) {
    hapticTap();
    setEditingId(reminder.id);
    setDraft(reminder.text);
  }

  async function saveDraft() {
    const text = draft.trim();
    if (!text || savingDraftRef.current) return;
    savingDraftRef.current = true;
    try {
      const now = new Date().toISOString();
      const current = await loadReminders();
      const next = editingId
        ? current.map((item) =>
            item.id === editingId ? { ...item, text, updatedAt: now } : item,
          )
        : [
            { id: reminderUid(), text, createdAt: now, updatedAt: now },
            ...current,
          ];
      await saveReminders(next);
      await updatePinnedNoteWidget(
        getPinnedLockScreenReminder(next)?.text,
        t(
          "Notiz in Zaymax auswählen",
          "Select a note in Zaymax",
          "Wybierz notatkę w Zaymax",
        ),
      );
      setReminders(next);
      setDraft("");
      setEditingId(null);
      hapticSuccess();
    } catch {
      showJournalStorageError();
    } finally {
      savingDraftRef.current = false;
    }
  }

  function cancelEdit() {
    hapticSelection();
    setDraft("");
    setEditingId(null);
  }

  function confirmDelete(reminder: Reminder) {
    hapticTap();
    Alert.alert(
      t("Eintrag löschen?", "Delete entry?"),
      t(
        "Dieser Tagebucheintrag wird dauerhaft entfernt.",
        "This journal entry will be removed permanently.",
      ),
      [
        { text: t("Abbrechen", "Cancel"), style: "cancel" },
        {
          text: t("Löschen", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const next = (await loadReminders()).filter(
                (item) => item.id !== reminder.id,
              );
              await saveReminders(next);
              setReminders(next);
              if (reminder.lockScreenNotificationId) {
                await dismissLockScreenReminder(
                  reminder.lockScreenNotificationId,
                );
              }
              await updatePinnedNoteWidget(
                getPinnedLockScreenReminder(next)?.text,
                t(
                  "Notiz in Zaymax auswählen",
                  "Select a note in Zaymax",
                  "Wybierz notatkę w Zaymax",
                ),
              );
              if (editingId === reminder.id) cancelEdit();
              hapticWarning();
            } catch {
              showJournalStorageError();
            }
          },
        },
      ],
    );
  }

  async function toggleLockScreenReminder(reminder: Reminder) {
    if (lockScreenBusyId) return;
    setLockScreenBusyId(reminder.id);
    let previous: Reminder[] = [];
    try {
      const current = await loadReminders();
      previous = current;
      const storedReminder =
        current.find((item) => item.id === reminder.id) ?? reminder;
      const willPin = !storedReminder.lockScreenPinned;
      const next = selectLockScreenReminder(
        current,
        willPin ? storedReminder.id : null,
      );
      const result = await updatePinnedNoteWidget(
        getPinnedLockScreenReminder(next)?.text,
        t(
          "Notiz in Zaymax auswählen",
          "Select a note in Zaymax",
          "Wybierz notatkę w Zaymax",
        ),
      );

      if (result === "unsupported") {
        Alert.alert(
          t(
            "Nur auf dem iPhone verfügbar",
            "Available on iPhone only",
            "Dostępne tylko na iPhonie",
          ),
          t(
            "Das Zaymax-Sperrbildschirm-Widget ist nur auf dem iPhone verfügbar.",
            "The Zaymax Lock Screen widget is available on iPhone only.",
            "Widżet Zaymax na ekran blokady jest dostępny tylko na iPhonie.",
          ),
        );
        return;
      }

      if (result === "requires-native-build") {
        Alert.alert(
          t(
            "Neuer iPhone-Build erforderlich",
            "New iPhone build required",
            "Wymagana jest nowa wersja na iPhone’a",
          ),
          t(
            "Das Widget ist im aktuell installierten Build noch nicht enthalten. Installiere den nächsten Zaymax-Build und wähle die Notiz danach erneut aus.",
            "The widget is not included in the currently installed build yet. Install the next Zaymax build, then select the note again.",
            "Widżet nie jest jeszcze zawarty w zainstalowanej wersji. Zainstaluj następną wersję Zaymax i ponownie wybierz notatkę.",
          ),
        );
        return;
      }

      if (result === "storage-unavailable") {
        Alert.alert(
          t(
            "Widget konnte nicht aktualisiert werden",
            "Widget could not be updated",
            "Nie udało się zaktualizować widżetu",
          ),
          t(
            "Die Notiz konnte nicht in der gemeinsamen iPhone-App-Gruppe gespeichert werden. Starte Zaymax neu und versuche es erneut.",
            "The note could not be saved to the shared iPhone App Group. Restart Zaymax and try again.",
            "Nie udało się zapisać notatki we wspólnej grupie aplikacji iPhone’a. Uruchom Zaymax ponownie i spróbuj jeszcze raz.",
          ),
        );
        return;
      }

      try {
        await saveReminders(next);
      } catch (error) {
        await updatePinnedNoteWidget(
          getPinnedLockScreenReminder(previous)?.text,
          t(
            "Notiz in Zaymax auswählen",
            "Select a note in Zaymax",
            "Wybierz notatkę w Zaymax",
          ),
        );
        throw error;
      }
      if (storedReminder.lockScreenNotificationId) {
        await dismissLockScreenReminder(
          storedReminder.lockScreenNotificationId,
        );
      }
      setReminders(next);
      if (willPin) {
        hapticSuccess();
        Alert.alert(
          t("Widget vorbereitet", "Widget ready", "Widżet gotowy"),
          t(
            "Halte den iPhone-Sperrbildschirm gedrückt, tippe auf Anpassen → Sperrbildschirm und füge dort „Zaymax Notiz“ hinzu. Danach zeigt das Widget immer die hier ausgewählte Notiz.",
            "Touch and hold the iPhone Lock Screen, tap Customize → Lock Screen, then add “Zaymax Note”. The widget will then always show the note selected here.",
            "Przytrzymaj ekran blokady iPhone’a, wybierz Dostosuj → Ekran blokady i dodaj „Zaymax Notiz”. Widżet będzie odtąd pokazywał wybraną tutaj notatkę.",
          ),
        );
      } else {
        hapticSelection();
      }
    } catch {
      hapticWarning();
      Alert.alert(
        t(
          "Erinnerung nicht aktiviert",
          "Reminder not enabled",
          "Nie włączono przypomnienia",
        ),
        t(
          "Die Sperrbildschirm-Erinnerung konnte nicht geändert werden. Bitte versuche es erneut.",
          "The Lock Screen reminder could not be changed. Please try again.",
          "Nie udało się zmienić przypomnienia na ekranie blokady. Spróbuj ponownie.",
        ),
      );
    } finally {
      setLockScreenBusyId(null);
    }
  }

  function openDaySelection() {
    hapticTap();
    setPendingDays(trainingDays);
    setDayModalVisible(true);
  }

  function toggleDay(day: Weekday) {
    hapticSelection();
    setPendingDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );
  }

  async function confirmDays() {
    const ordered = WEEKDAYS.map((day) => day.value).filter((day) =>
      pendingDays.includes(day),
    );
    try {
      await saveTrainingDays(ordered);
      setTrainingDays(ordered);
      setDayModalVisible(false);
      setConfettiBurst((current) => current + 1);
      hapticSuccess();
      if (confettiTimer.current) clearTimeout(confettiTimer.current);
      confettiTimer.current = setTimeout(() => setConfettiBurst(0), 1250);
    } catch {
      showJournalStorageError();
    }
  }

  function showJournalStorageError() {
    hapticWarning();
    Alert.alert(
      t(
        "Tagebuch nicht gespeichert",
        "Journal not saved",
        "Nie zapisano dziennika",
      ),
      t(
        "Deine bisherigen Einträge bleiben erhalten. Bitte versuche es erneut.",
        "Your previous entries remain unchanged. Please try again.",
        "Poprzednie wpisy pozostają bez zmian. Spróbuj ponownie.",
      ),
    );
  }

  const selectedDayLabels = WEEKDAYS.filter((day) =>
    trainingDays.includes(day.value),
  ).map((day) => t(day.de, day.en, day.pl));

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      {confettiBurst ? <WhiteConfetti burst={confettiBurst} /> : null}
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 128, flexGrow: 1 }}
        ListHeaderComponent={
          <>
            <View className="pt-3 pb-6">
              <ZaymaxWordmark />
              <View>
                <Text className="mt-1 text-3xl font-black text-foreground">
                  {t("Tagebuch", "Journal")}
                </Text>
                <Text className="mt-2 text-sm leading-5 text-muted">
                  {t(
                    "Deine Trainingstage und Gedanken für Training oder Leben.",
                    "Your training days and thoughts for workouts or life.",
                  )}
                </Text>
              </View>
            </View>

            <ProfileBmiCard />

            <View
              className="bg-surface p-[18px]"
              style={{
                position: "relative",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.card,
                backgroundColor: "transparent",
                ...ZAYMAX_DESIGN.shadow,
              }}
            >
              <GlassMaterial intensity={26} />
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                    {t("TRAININGSWOCHE", "TRAINING WEEK")}
                  </Text>
                  <Text className="mt-2 text-xl font-black text-foreground">
                    {t("Deine Trainingstage", "Your training days")}
                  </Text>
                </View>
                <IconSymbol name="calendar" size={23} color={colors.primary} />
              </View>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = trainingDays.includes(day.value);
                  return (
                    <View
                      key={day.value}
                      style={{
                        minWidth: 37,
                        borderRadius: ZAYMAX_DESIGN.radius.round,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected
                          ? colors.primary
                          : colors.background,
                        paddingHorizontal: 9,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          textAlign: "center",
                          color: selected ? colors.background : colors.muted,
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        {t(day.deShort, day.enShort, day.plShort)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text className="mt-3 text-sm leading-5 text-muted">
                {selectedDayLabels.length
                  ? selectedDayLabels.join(" · ")
                  : t(
                      "Noch keine Trainingstage ausgewählt.",
                      "No training days selected yet.",
                    )}
              </Text>
              <Pressable
                accessibilityLabel={t(
                  "Trainingstage auswählen",
                  "Select training days",
                )}
                onPress={openDaySelection}
                style={({ pressed }) => [
                  {
                    marginTop: 16,
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                    paddingVertical: 13,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  className="text-center font-black tracking-[0.4px]"
                  style={{ color: colors.primary }}
                >
                  {t("Tage auswählen", "Select days")}
                </Text>
              </Pressable>
            </View>

            <Animated.View
              entering={FadeIn.duration(ZAYMAX_DESIGN.motion.quick)}
              className="bg-surface p-[18px]"
              style={{
                marginTop: 16,
                position: "relative",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.card,
                backgroundColor: "transparent",
              }}
            >
              <GlassMaterial intensity={24} />
              <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                {editingId
                  ? t("EINTRAG BEARBEITEN", "EDIT ENTRY")
                  : t("NEUER EINTRAG", "NEW ENTRY")}
              </Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t(
                  "Was möchtest du festhalten?",
                  "What would you like to remember?",
                )}
                placeholderTextColor={colors.muted}
                multiline
                style={{
                  minHeight: 96,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: ZAYMAX_DESIGN.radius.input,
                  backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.foreground,
                  fontSize: 16,
                  lineHeight: 23,
                  textAlignVertical: "top",
                }}
              />
              <View className="mt-3 flex-row justify-end gap-2">
                {editingId ? (
                  <Pressable
                    onPress={cancelEdit}
                    style={({ pressed }) => [
                      {
                        borderRadius: ZAYMAX_DESIGN.radius.round,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 15,
                        paddingVertical: 11,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text className="font-bold text-muted">
                      {t("Abbrechen", "Cancel")}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel={
                    editingId
                      ? t("Tagebucheintrag speichern", "Save journal entry")
                      : t("Tagebucheintrag hinzufügen", "Add journal entry")
                  }
                  onPress={() => void saveDraft()}
                  style={({ pressed }) => [
                    {
                      borderRadius: ZAYMAX_DESIGN.radius.round,
                      backgroundColor: ZAYMAX_DESIGN.colors.action,
                      paddingHorizontal: 18,
                      paddingVertical: 11,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text className="font-black text-background">
                    {editingId
                      ? t("Speichern", "Save")
                      : t("Hinzufügen", "Add")}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
            <Text className="mt-7 mb-3 text-xl font-black text-foreground">
              {t("Meine Einträge", "My entries")}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View
            className="flex-1 items-center justify-center border border-border bg-surface/40 p-7"
            style={{ borderRadius: ZAYMAX_DESIGN.radius.card }}
          >
            <IconSymbol name="pencil" size={29} color={colors.foreground} />
            <Text className="mt-4 text-lg font-black text-foreground">
              {t("Dein Tagebuch ist noch leer", "Your journal is still empty")}
            </Text>
            <Text className="mt-2 text-center leading-5 text-muted">
              {t(
                "Halte Gedanken fürs Leben oder dein nächstes Training fest.",
                "Save thoughts for life or your next workout.",
              )}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index * 40, 160)).duration(200)}
            layout={Layout.duration(150)}
            style={{ marginBottom: 10 }}
          >
            <View
              style={{
                minHeight: 88,
                position: "relative",
                overflow: "hidden",
                borderRadius: ZAYMAX_DESIGN.radius.nested,
                borderWidth: 1,
                borderColor:
                  editingId === item.id || item.lockScreenPinned
                    ? colors.primary
                    : colors.border,
                backgroundColor: "transparent",
                padding: 16,
              }}
            >
              <GlassMaterial
                raised={Boolean(item.lockScreenPinned)}
                intensity={22}
                radius={ZAYMAX_DESIGN.radius.nested}
              />
              <Pressable
                accessibilityLabel={t(
                  "Tagebucheintrag bearbeiten",
                  "Edit journal entry",
                )}
                onPress={() => beginEdit(item)}
                style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
              >
                <Text className="text-base leading-6 text-foreground">
                  {item.text}
                </Text>
                <Text className="mt-3 text-xs text-muted">
                  {formatJournalDate(item.updatedAt, locale)} ·{" "}
                  {t(
                    "Tippen zum Bearbeiten",
                    "Tap to edit",
                    "Dotknij, aby edytować",
                  )}
                </Text>
              </Pressable>
              <View className="mt-4 flex-row items-center justify-between gap-3">
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{
                    checked: Boolean(item.lockScreenPinned),
                    disabled: lockScreenBusyId === item.id,
                  }}
                  accessibilityLabel={t(
                    "Notiz für Sperrbildschirm-Widget auswählen",
                    "Select note for Lock Screen widget",
                    "Wybierz notatkę dla widżetu ekranu blokady",
                  )}
                  disabled={Boolean(lockScreenBusyId)}
                  onPress={() => void toggleLockScreenReminder(item)}
                  style={({ pressed }) => ({
                    minHeight: 38,
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    borderWidth: 1,
                    borderColor: item.lockScreenPinned
                      ? colors.primary
                      : colors.border,
                    backgroundColor: item.lockScreenPinned
                      ? `${colors.primary}20`
                      : colors.background,
                    paddingHorizontal: 12,
                    opacity:
                      lockScreenBusyId === item.id ? 0.45 : pressed ? 0.62 : 1,
                  })}
                >
                  <IconSymbol
                    name={item.lockScreenPinned ? "pin.fill" : "note.text"}
                    size={16}
                    color={
                      item.lockScreenPinned ? colors.primary : colors.muted
                    }
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: item.lockScreenPinned
                        ? colors.primary
                        : colors.foreground,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {item.lockScreenPinned
                      ? t(
                          "Für Widget ausgewählt",
                          "Selected for widget",
                          "Wybrano do widżetu",
                        )
                      : t(
                          "Im Sperrbildschirm-Widget zeigen",
                          "Show in Lock Screen widget",
                          "Pokaż w widżecie ekranu blokady",
                        )}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={t(
                    "Tagebucheintrag löschen",
                    "Delete journal entry",
                    "Usuń wpis z dziennika",
                  )}
                  onPress={() => confirmDelete(item)}
                  style={({ pressed }) => ({
                    width: 38,
                    height: 38,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <IconSymbol
                    name="trash.fill"
                    size={17}
                    color={colors.error}
                  />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
      />

      <Modal
        visible={dayModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDayModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 22,
            backgroundColor: ZAYMAX_DESIGN.colors.overlay,
          }}
        >
          <View
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: ZAYMAX_DESIGN.radius.hero,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "transparent",
              padding: 20,
            }}
          >
            <GlassMaterial
              raised
              intensity={32}
              radius={ZAYMAX_DESIGN.radius.hero}
            />
            <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
              {t("TRAININGSWOCHE", "TRAINING WEEK")}
            </Text>
            <Text className="mt-2 text-3xl font-black text-foreground">
              {t("Tage auswählen", "Select days")}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              {t(
                "Wähle alle Tage aus, an denen du normalerweise trainieren möchtest.",
                "Select every day on which you usually want to train.",
              )}
            </Text>
            <View className="mt-5 gap-2">
              {WEEKDAYS.map((day) => {
                const selected = pendingDays.includes(day.value);
                return (
                  <Pressable
                    key={day.value}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={t(day.de, day.en, day.pl)}
                    onPress={() => toggleDay(day.value)}
                    style={({ pressed }) => [
                      {
                        minHeight: 48,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: ZAYMAX_DESIGN.radius.nested,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected
                          ? colors.primary
                          : colors.background,
                        paddingHorizontal: 14,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? colors.background : colors.foreground,
                        fontWeight: "800",
                      }}
                    >
                      {t(day.de, day.en, day.pl)}
                    </Text>
                    <Text
                      style={{
                        color: selected ? colors.background : colors.muted,
                        fontSize: 16,
                        fontWeight: "900",
                      }}
                    >
                      {selected ? "✓" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityLabel={t(
                "Trainingstage bestätigen",
                "Confirm training days",
              )}
              onPress={() => void confirmDays()}
              style={({ pressed }) => [
                {
                  marginTop: 16,
                  borderRadius: ZAYMAX_DESIGN.radius.round,
                  backgroundColor: ZAYMAX_DESIGN.colors.action,
                  paddingVertical: 14,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text className="text-center font-black tracking-[0.4px] text-background">
                {t("Auswählen", "Select")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticTap();
                setDayModalVisible(false);
              }}
              style={({ pressed }) => [
                {
                  marginTop: 8,
                  paddingVertical: 10,
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <Text className="text-center font-semibold text-muted">
                {t("Abbrechen", "Cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function formatJournalDate(date: string, locale: string) {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

const WHITE_CONFETTI = [
  { x: -170, y: 370, rotate: -180 },
  { x: -140, y: 520, rotate: 150 },
  { x: -112, y: 410, rotate: -120 },
  { x: -86, y: 560, rotate: 210 },
  { x: -58, y: 445, rotate: -155 },
  { x: -31, y: 600, rotate: 170 },
  { x: -10, y: 470, rotate: -220 },
  { x: 15, y: 590, rotate: 190 },
  { x: 42, y: 430, rotate: -145 },
  { x: 68, y: 550, rotate: 230 },
  { x: 95, y: 390, rotate: -175 },
  { x: 122, y: 520, rotate: 140 },
  { x: 148, y: 425, rotate: -210 },
  { x: 174, y: 575, rotate: 180 },
] as const;

function WhiteConfetti({ burst }: { burst: number }) {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 50, overflow: "hidden", pointerEvents: "none" },
      ]}
    >
      {WHITE_CONFETTI.map((piece, index) => (
        <WhitePiece
          key={String(burst) + "-" + index}
          index={index}
          {...piece}
        />
      ))}
    </View>
  );
}

function WhitePiece({
  index,
  x,
  y,
  rotate,
}: {
  index: number;
  x: number;
  y: number;
  rotate: number;
}) {
  const travel = useSharedValue(0);
  useEffect(() => {
    travel.value = 0;
    travel.value = withDelay(index * 14, withTiming(1, { duration: 1000 }));
  }, [index, travel]);
  const style = useAnimatedStyle(() => ({
    opacity:
      travel.value < 0.12 ? travel.value * 8.3 : Math.max(0, 1 - travel.value),
    transform: [
      { translateX: x * travel.value },
      { translateY: y * travel.value },
      { rotate: String(rotate * travel.value) + "deg" },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: "50%",
          top: 165,
          width: index % 3 === 0 ? 12 : 8,
          height: index % 3 === 0 ? 12 : 8,
          borderRadius: 999,
          backgroundColor: index % 2 ? "#FFFFFF" : "#CFCFCF",
        },
        style,
      ]}
    />
  );
}
