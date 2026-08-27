import { Pressable, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZaymaxWatermark } from "@/components/zaymax-watermark";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";

const POLICY_VERSION = "26.08.2026";
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.2";

export default function PrivacyScreen() {
  const colors = useColors("dark");
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="flex-row items-start pt-3 pb-6">
          <ZaymaxWatermark />
          <View className="ml-3 flex-1">
            <Text className="text-xs font-black uppercase tracking-[3px] text-muted">
              ZAYMAX / PRIVACY
            </Text>
            <Text className="mt-1 text-3xl font-black text-foreground">
              {t("Datenschutz & Hilfe", "Privacy & help")}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Zurück", "Back")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/settings")
          }
          style={({ pressed }) => ({
            minHeight: 50,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: ZAYMAX_DESIGN.radius.round,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <IconSymbol name="chevron.left" size={21} color={colors.foreground} />
          <Text className="ml-1 font-black text-foreground">
            {t("Zurück", "Back")}
          </Text>
        </Pressable>

        <PrivacyCard
          eyebrow={t("KURZFASSUNG", "AT A GLANCE")}
          title={t("Deine Daten bleiben bei dir", "Your data stays with you")}
          colors={colors}
        >
          <BodyText colors={colors}>
            {t(
              "Zaymax benötigt kein Konto, enthält keine Werbung und verwendet kein Tracking oder Analyse-SDK. Deine Eingaben werden nicht an Zaymax oder den Entwickler übertragen.",
              "Zaymax requires no account, contains no advertising and uses no tracking or analytics SDK. Your entries are not transmitted to Zaymax or the developer.",
            )}
          </BodyText>
        </PrivacyCard>

        <PrivacyCard
          eyebrow={t("LOKALE DATEN", "LOCAL DATA")}
          title={t("Was gespeichert wird", "What is stored")}
          colors={colors}
        >
          <Bullet colors={colors}>
            {t(
              "Workouts, Übungen, Sätze, Gewicht und Wiederholungen",
              "Workouts, exercises, sets, weight and repetitions",
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              "Trainingshistorie, Fortschritte und dein Trainingsgefühl",
              "Workout history, progress and how the workout felt",
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              "Tagebucheinträge und ausgewählte Trainingstage",
              "Journal entries and selected training days",
            )}
          </Bullet>
          <Bullet colors={colors}>
            {t(
              "Optional: Gewicht, Größe und Geburtstag für BMI und Geburtstagsgruß",
              "Optional: weight, height and birthday for BMI and the birthday greeting",
            )}
          </Bullet>
          <BodyText colors={colors} style={{ marginTop: 12 }}>
            {t(
              "Diese Daten liegen ausschließlich im lokalen App-Speicher deines Geräts. Zaymax greift nicht auf Standort, Kontakte, Kamera oder Mikrofon zu.",
              "This data is stored only in the app's local storage on your device. Zaymax does not access location, contacts, camera or microphone.",
            )}
          </BodyText>
        </PrivacyCard>

        <PrivacyCard
          eyebrow="APPLE HEALTH"
          title={t("Schritte nur mit Erlaubnis", "Steps only with permission")}
          colors={colors}
        >
          <BodyText colors={colors}>
            {t(
              "Wenn du die Verbindung im Tab Schritte selbst aktivierst, liest Zaymax ausschließlich deine Schrittzahlen aus Apple Health, um Tages- und Wochenwerte anzuzeigen. Die Verarbeitung erfolgt nur auf deinem Gerät. Zaymax schreibt keine Daten in Apple Health, überträgt keine Schrittzahlen an den Entwickler oder externe Server und nimmt sie nicht in das JSON-Backup auf. Du kannst den Zugriff jederzeit in den iOS-Einstellungen für Health ändern oder widerrufen.",
              "When you activate the connection yourself in the Steps tab, Zaymax reads only your step counts from Apple Health to display daily and weekly values. Processing happens only on your device. Zaymax does not write data to Apple Health, transmit step counts to the developer or external servers, or include them in the JSON backup. You can change or revoke access at any time in the iOS Health settings.",
            )}
          </BodyText>
        </PrivacyCard>

        <PrivacyCard
          eyebrow={t("BACKUP", "BACKUP")}
          title={t(
            "Export unter deiner Kontrolle",
            "Export under your control",
          )}
          colors={colors}
        >
          <BodyText colors={colors}>
            {t(
              "Nur wenn du in den Einstellungen selbst ein Backup erstellst, erzeugt Zaymax eine JSON-Datei und öffnet das Teilen-Menü deines Geräts. Du entscheidest, ob und wohin die Datei geteilt wird. Für den gewählten Speicher- oder Teilendienst gelten dessen Datenschutzregeln.",
              "Only when you create a backup yourself in Settings does Zaymax generate a JSON file and open your device's share sheet. You decide whether and where the file is shared. The chosen storage or sharing service applies its own privacy terms.",
            )}
          </BodyText>
        </PrivacyCard>

        <PrivacyCard
          eyebrow={t("LÖSCHUNG", "DELETION")}
          title={t("Du behältst die Kontrolle", "You stay in control")}
          colors={colors}
        >
          <BodyText colors={colors}>
            {t(
              "Einzelne Workouts und Einträge kannst du direkt in der App löschen. Unter Einstellungen → Alle lokalen Daten löschen entfernst du sämtliche Zaymax-Daten. Auch das Löschen der App entfernt den lokalen App-Speicher. Zaymax besitzt keine Serverkopie, die zusätzlich angefordert werden müsste.",
              "You can delete individual workouts and entries inside the app. Settings → Delete all local data removes all Zaymax data. Deleting the app also removes its local app storage. Zaymax has no server copy that would require a separate deletion request.",
            )}
          </BodyText>
        </PrivacyCard>

        <PrivacyCard
          eyebrow={t("GESUNDHEIT", "HEALTH")}
          title={t("Hinweis zu BMI und Training", "BMI and training notice")}
          colors={colors}
        >
          <BodyText colors={colors}>
            {t(
              "BMI, Farbbereiche und Trainingsauswertungen sind allgemeine Orientierungshilfen. Sie sind keine medizinische Beratung, Diagnose oder Behandlung. Bei gesundheitlichen Beschwerden oder Unsicherheit wende dich an medizinisches Fachpersonal.",
              "BMI, color ranges and workout insights are general guidance only. They are not medical advice, diagnosis or treatment. If you have health concerns or are unsure, consult a qualified medical professional.",
            )}
          </BodyText>
        </PrivacyCard>

        <PrivacyCard
          eyebrow={t("HILFE", "HELP")}
          title={t("Support", "Support")}
          colors={colors}
        >
          <BodyText colors={colors}>
            {t(
              "Bei Fragen, Problemen oder Datenschutzanliegen nutze bitte den Support-Kontakt auf der Zaymax-Produktseite im App Store.",
              "For questions, issues or privacy requests, please use the support contact on the Zaymax product page in the App Store.",
            )}
          </BodyText>
        </PrivacyCard>

        <Text className="mt-6 text-center text-xs leading-5 text-muted">
          {t("Stand", "Last updated")}: {POLICY_VERSION}
          {"\n"}Zaymax {APP_VERSION}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function PrivacyCard({
  eyebrow,
  title,
  colors,
  children,
}: {
  eyebrow: string;
  title: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: ZAYMAX_DESIGN.radius.card,
        backgroundColor: colors.surface,
        padding: 20,
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
        {eyebrow}
      </Text>
      <Text className="mt-2 mb-3 text-xl font-black text-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}

function BodyText({
  children,
  colors,
  style,
}: {
  children: React.ReactNode;
  colors: any;
  style?: object;
}) {
  return (
    <Text
      style={[{ color: colors.muted, fontSize: 14, lineHeight: 21 }, style]}
    >
      {children}
    </Text>
  );
}

function Bullet({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={{ marginTop: 7, flexDirection: "row" }}>
      <Text style={{ width: 17, color: colors.foreground, fontWeight: "900" }}>
        •
      </Text>
      <Text
        style={{ flex: 1, color: colors.muted, fontSize: 14, lineHeight: 20 }}
      >
        {children}
      </Text>
    </View>
  );
}
