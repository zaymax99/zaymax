import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { useColors } from "@/hooks/use-colors";
import { loadReminders, reminderUid, saveReminders, type Reminder } from "@/lib/reminders";

export default function RemindersScreen() {
  const colors = useColors("dark");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const refresh = useCallback(async () => setReminders(await loadReminders()), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  function beginEdit(reminder: Reminder) { setEditingId(reminder.id); setDraft(reminder.text); }
  async function saveDraft() { const text = draft.trim(); if (!text) return; const now = new Date().toISOString(); const current = await loadReminders(); const next = editingId ? current.map((item) => item.id === editingId ? { ...item, text, updatedAt: now } : item) : [{ id: reminderUid(), text, createdAt: now, updatedAt: now }, ...current]; await saveReminders(next); setReminders(next); setDraft(""); setEditingId(null); }
  function cancelEdit() { setDraft(""); setEditingId(null); }
  function confirmDelete(reminder: Reminder) { Alert.alert("Erinnerung löschen?", "Diese Notiz wird dauerhaft entfernt.", [{ text: "Abbrechen", style: "cancel" }, { text: "Löschen", style: "destructive", onPress: async () => { const next = (await loadReminders()).filter((item) => item.id !== reminder.id); await saveReminders(next); setReminders(next); } }]); }

  return <ScreenContainer className="px-5" containerClassName="bg-background"><FlatList data={reminders} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34, flexGrow: 1 }} ListHeaderComponent={<><View className="flex-row items-start pt-3 pb-6"><ZaymaxWatermark /><View className="ml-3 flex-1"><Text className="text-xs font-bold uppercase tracking-[2px] text-muted">ZAYMAX</Text><Text className="mt-1 text-3xl font-bold text-foreground">Erinnerungen</Text><Text className="mt-2 text-base text-muted">Kurze Notizen für dein Training.</Text></View></View><Animated.View entering={FadeIn.duration(250)} className="rounded-md bg-surface/80 p-4" style={{ borderWidth: 1, borderColor: colors.border }}><TextInput value={draft} onChangeText={setDraft} placeholder="Neue Erinnerung schreiben …" placeholderTextColor={colors.muted} multiline style={{ minHeight: 70, color: colors.foreground, fontSize: 16, lineHeight: 23, textAlignVertical: "top" }} /><View className="mt-3 flex-row justify-end gap-2">{editingId && <Pressable onPress={cancelEdit} style={{ borderRadius: 4, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, paddingVertical: 11 }}><Text className="font-bold text-muted">Abbrechen</Text></Pressable>}<Pressable onPress={saveDraft} style={({ pressed }) => [{ borderRadius: 4, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 11, opacity: pressed ? 0.7 : 1 }]}><Text className="font-bold text-background">{editingId ? "Speichern" : "Hinzufügen"}</Text></Pressable></View></Animated.View><Text className="mt-8 mb-3 text-xl font-bold text-foreground">Meine Notizen</Text></>} ListEmptyComponent={<View className="flex-1 items-center justify-center rounded-md border border-border bg-surface/40 p-7"><Text className="text-lg font-bold text-foreground">Noch keine Erinnerungen</Text><Text className="mt-2 text-center leading-5 text-muted">Schreibe oben eine kurze Notiz</Text></View>} renderItem={({ item, index }) => <Animated.View entering={FadeInDown.delay(index * 50).duration(260)} layout={Layout.duration(180)} style={{ marginBottom: 10 }}><Pressable onPress={() => beginEdit(item)} onLongPress={() => confirmDelete(item)} style={({ pressed }) => [{ minHeight: 74, justifyContent: "center", borderRadius: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: `${colors.surface}66`, paddingHorizontal: 17, paddingVertical: 15, opacity: pressed ? 0.7 : 1 }]}><Text className="text-base leading-6 text-foreground">{item.text}</Text><Text className="mt-2 text-xs text-muted">Tippen zum Bearbeiten · Gedrückt halten zum Löschen</Text></Pressable></Animated.View>} /></ScreenContainer>;
}
