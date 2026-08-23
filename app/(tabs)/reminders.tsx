import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
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

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProfileBmiCard } from "@/components/profile-bmi-card";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";
import {
  loadReminders,
  loadTrainingDays,
  reminderUid,
  saveReminders,
  saveTrainingDays,
  type Reminder,
  type Weekday,
} from "@/lib/reminders";

const WEEKDAYS: {
  value: Weekday;
  de: string;
  en: string;
  deShort: string;
  enShort: string;
}[] = [
  {
    value: "monday",
    de: "Montag",
    en: "Monday",
    deShort: "Mo",
    enShort: "Mon",
  },
  {
    value: "tuesday",
    de: "Dienstag",
    en: "Tuesday",
    deShort: "Di",
    enShort: "Tue",
  },
  {
    value: "wednesday",
    de: "Mittwoch",
    en: "Wednesday",
    deShort: "Mi",
    enShort: "Wed",
  },
  {
    value: "thursday",
    de: "Donnerstag",
    en: "Thursday",
    deShort: "Do",
    enShort: "Thu",
  },
  {
    value: "friday",
    de: "Freitag",
    en: "Friday",
    deShort: "Fr",
    enShort: "Fri",
  },
  {
    value: "saturday",
    de: "Samstag",
    en: "Saturday",
    deShort: "Sa",
    enShort: "Sat",
  },
  {
    value: "sunday",
    de: "Sonntag",
    en: "Sunday",
    deShort: "So",
    enShort: "Sun",
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
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const [notes, days] = await Promise.all([
      loadReminders(),
      loadTrainingDays(),
    ]);
    setReminders(notes);
    setTrainingDays(days);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  useEffect(
    () => () => {
      if (confettiTimer.current) clearTimeout(confettiTimer.current);
    },
    [],
  );

  function beginEdit(reminder: Reminder) {
    setEditingId(reminder.id);
    setDraft(reminder.text);
  }

  async function saveDraft() {
    const text = draft.trim();
    if (!text) return;
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
    setReminders(next);
    setDraft("");
    setEditingId(null);
  }

  function cancelEdit() {
    setDraft("");
    setEditingId(null);
  }

  function confirmDelete(reminder: Reminder) {
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
            const next = (await loadReminders()).filter(
              (item) => item.id !== reminder.id,
            );
            await saveReminders(next);
            setReminders(next);
            if (editingId === reminder.id) cancelEdit();
          },
        },
      ],
    );
  }

  function openDaySelection() {
    setPendingDays(trainingDays);
    setDayModalVisible(true);
  }

  function toggleDay(day: Weekday) {
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
    await saveTrainingDays(ordered);
    setTrainingDays(ordered);
    setDayModalVisible(false);
    setConfettiBurst((current) => current + 1);
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
    confettiTimer.current = setTimeout(() => setConfettiBurst(0), 1250);
  }

  const selectedDayLabels = WEEKDAYS.filter((day) =>
    trainingDays.includes(day.value),
  ).map((day) => t(day.de, day.en));

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      {confettiBurst ? <WhiteConfetti burst={confettiBurst} /> : null}
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 34, flexGrow: 1 }}
        ListHeaderComponent={
          <>
            <View className="flex-row items-start pt-3 pb-6">
              <ZaymaxWatermark />
              <View className="ml-3 flex-1">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-muted">
                  ZAYMAX
                </Text>
                <Text className="mt-1 text-3xl font-black text-foreground">
                  {t("Tagebuch", "Journal")}
                </Text>
                <Text className="mt-2 text-base leading-6 text-muted">
                  {t(
                    "Deine Trainingstage und Gedanken für Training oder Leben.",
                    "Your training days and thoughts for workouts or life.",
                  )}
                </Text>
              </View>
            </View>

            <ProfileBmiCard />

            <View
              className="bg-surface p-5"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.card,
              }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-black uppercase tracking-[2px] text-muted">
                    {t("TRAININGSWOCHE", "TRAINING WEEK")}
                  </Text>
                  <Text className="mt-2 text-xl font-black text-foreground">
                    {t("Deine Trainingstage", "Your training days")}
                  </Text>
                </View>
                <IconSymbol
                  name="calendar"
                  size={23}
                  color={colors.foreground}
                />
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
                        borderColor: selected
                          ? colors.foreground
                          : colors.border,
                        backgroundColor: selected
                          ? colors.foreground
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
                        {t(day.deShort, day.enShort)}
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
                    borderColor: colors.foreground,
                    paddingVertical: 13,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text className="text-center font-black tracking-[0.4px] text-foreground">
                  {t("Tage auswählen", "Select days")}
                </Text>
              </Pressable>
            </View>

            <Animated.View
              entering={FadeIn.duration(ZAYMAX_DESIGN.motion.quick)}
              className="bg-surface p-4"
              style={{
                marginTop: 16,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: ZAYMAX_DESIGN.radius.card,
              }}
            >
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
                  minHeight: 82,
                  marginTop: 12,
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
                      backgroundColor: colors.primary,
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
            <Text className="mt-8 mb-3 text-xl font-black text-foreground">
              {t("Meine Einträge", "My entries")}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center rounded-3xl border border-border bg-surface/40 p-7">
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
                borderRadius: ZAYMAX_DESIGN.radius.nested,
                borderWidth: 1,
                borderColor:
                  editingId === item.id ? colors.foreground : colors.border,
                backgroundColor: colors.surface,
                padding: 16,
              }}
            >
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
                  {t("Tippen zum Bearbeiten", "Tap to edit")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t(
                  "Tagebucheintrag löschen",
                  "Delete journal entry",
                )}
                onPress={() => confirmDelete(item)}
                style={({ pressed }) => [
                  {
                    position: "absolute",
                    right: 8,
                    bottom: 8,
                    padding: 8,
                    borderRadius: ZAYMAX_DESIGN.radius.round,
                    opacity: pressed ? 0.55 : 1,
                  },
                ]}
              >
                <IconSymbol name="trash.fill" size={18} color={colors.muted} />
              </Pressable>
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
            backgroundColor: "rgba(0,0,0,0.88)",
          }}
        >
          <View
            style={{
              borderRadius: ZAYMAX_DESIGN.radius.hero,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 20,
            }}
          >
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
                    accessibilityLabel={t(day.de, day.en)}
                    onPress={() => toggleDay(day.value)}
                    style={({ pressed }) => [
                      {
                        minHeight: 48,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: ZAYMAX_DESIGN.radius.nested,
                        borderWidth: 1,
                        borderColor: selected
                          ? colors.foreground
                          : colors.border,
                        backgroundColor: selected
                          ? colors.foreground
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
                      {t(day.de, day.en)}
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
                  backgroundColor: colors.primary,
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
              onPress={() => setDayModalVisible(false)}
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
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
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
