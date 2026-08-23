import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";

export function KeyboardDismissButton() {
  const colors = useColors("dark");
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const isTextField = (target: EventTarget | null) => {
        const element = target as HTMLElement | null;
        return Boolean(
          element &&
          (element.tagName === "INPUT" || element.tagName === "TEXTAREA"),
        );
      };
      const handleFocusIn = (event: FocusEvent) => {
        if (isTextField(event.target)) setIsVisible(true);
      };
      const handleFocusOut = () => {
        window.setTimeout(() => {
          if (!isTextField(document.activeElement)) setIsVisible(false);
        }, 120);
      };
      window.addEventListener("focusin", handleFocusIn);
      window.addEventListener("focusout", handleFocusOut);
      return () => {
        window.removeEventListener("focusin", handleFocusIn);
        window.removeEventListener("focusout", handleFocusOut);
      };
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
      setIsVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (!isVisible) return null;

  const bottom =
    Platform.OS === "ios"
      ? keyboardHeight + 10
      : Math.max(insets.bottom + 10, 14);

  return (
    <Animated.View
      entering={FadeIn.duration(130)}
      exiting={FadeOut.duration(100)}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        bottom,
        zIndex: 1000,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Tastatur ausblenden", "Hide keyboard")}
        onPress={() => {
          Keyboard.dismiss();
          if (
            Platform.OS === "web" &&
            document.activeElement instanceof HTMLElement
          ) {
            document.activeElement.blur();
          }
        }}
        style={({ pressed }) => ({
          minHeight: 42,
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <IconSymbol
          name="keyboard.chevron.compact.down"
          size={20}
          color={colors.foreground}
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
      </Pressable>
    </Animated.View>
  );
}
