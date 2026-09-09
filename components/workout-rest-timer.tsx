import { Pressable, StyleSheet, Text, View } from "react-native";

import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { GoldAccent } from "@/components/gold-accent";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";

type WorkoutRestTimerProps = {
  time: string;
  running: boolean;
  disabled: boolean;
  onToggle: () => void;
  onReset: () => void;
};

export function WorkoutRestTimer({
  time,
  running,
  disabled,
  onToggle,
  onReset,
}: WorkoutRestTimerProps) {
  const colors = useColors("dark");
  const { t } = useLanguage();

  return (
    <LiquidGlassSurface radius={28} style={styles.surface}>
      <View style={styles.readout}>
        <View style={styles.labelRow}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={[styles.label, { color: colors.muted }]}
          >
            {t("PAUSENTIMER", "REST TIMER")}
          </Text>
          {running ? <GoldAccent variant="dot" /> : null}
        </View>
        <Text
          accessibilityLabel={`${t("PAUSENTIMER", "REST TIMER")} ${time}`}
          maxFontSizeMultiplier={1.4}
          style={[styles.time, { color: colors.foreground }]}
        >
          {time}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          running
            ? t("Timer pausieren", "Pause timer")
            : t("Timer starten", "Start timer")
        }
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.control,
          styles.primary,
          { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        ]}
      >
        <IconSymbol
          name={running ? "pause.fill" : "play.fill"}
          size={20}
          color={ZAYMAX_DESIGN.colors.background}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Timer zurücksetzen", "Reset timer")}
        disabled={disabled}
        onPress={onReset}
        style={({ pressed }) => [
          styles.control,
          styles.secondary,
          { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        ]}
      >
        <IconSymbol
          name="arrow.counterclockwise"
          size={20}
          color={colors.foreground}
        />
      </Pressable>
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 72,
  },
  readout: { flex: 1, minWidth: 0, paddingRight: 4 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1,
    flexShrink: 1,
  },
  time: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  control: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: ZAYMAX_DESIGN.colors.action },
  secondary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ZAYMAX_DESIGN.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
