import { Keyboard, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlassButton } from "@/components/glass-button";
import { useColors } from "@/hooks/use-colors";
import { useKeyboardState } from "@/hooks/use-keyboard-state";
import { hapticTap } from "@/lib/haptics";
import { useLanguage } from "@/lib/i18n";

export function KeyboardDismissButton() {
  const colors = useColors("dark");
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isVisible } = useKeyboardState();

  if (!isVisible) return null;

  const bottom =
    Platform.OS === "ios"
      ? keyboardHeight + 10
      : Math.max(insets.bottom + 10, 14);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        bottom,
        zIndex: 1000,
      }}
    >
      <GlassButton
        accessibilityRole="button"
        accessibilityLabel={t("Tastatur ausblenden", "Hide keyboard")}
        onPress={() => {
          hapticTap();
          Keyboard.dismiss();
          if (
            Platform.OS === "web" &&
            document.activeElement instanceof HTMLElement
          ) {
            document.activeElement.blur();
          }
        }}
        surfaceStyle={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          paddingHorizontal: 14,
        }}
      >
        <IconSymbol
          name="keyboard.chevron.compact.down"
          size={20}
          color={colors.primary}
        />
        <Text
          style={{
            color: colors.foreground,
            fontSize: 12,
            fontWeight: "800",
          }}
        >
          {t("Tastatur schließen", "Hide keyboard")}
        </Text>
      </GlassButton>
    </View>
  );
}
