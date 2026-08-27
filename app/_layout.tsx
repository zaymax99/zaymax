import "@/global.css";
import {
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/i18n";
import { KeyboardDismissButton } from "@/components/keyboard-dismiss-button";
import { AppExperienceOverlay } from "@/components/app-experience-overlay";
import { dismissAllLockScreenReminders } from "@/lib/lock-screen-reminders";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

const APP_BACKGROUND = "#0D0D0D";
const NAVIGATION_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#D4B86A",
    background: APP_BACKGROUND,
    card: "#1B1B1A",
    text: "#F1EFEA",
    border: "#302F2C",
    notification: "#D4B86A",
  },
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  useEffect(() => {
    // One-release migration: remove journal notifications created by older
    // builds now that notes use the dedicated Lock Screen widget.
    void dismissAllLockScreenReminders().catch(() => undefined);
  }, []);

  const providerInitialMetrics = useMemo(() => {
    if (!initialWindowMetrics) return undefined;
    return {
      ...initialWindowMetrics,
      insets: {
        ...initialWindowMetrics.insets,
        top: Math.max(initialWindowMetrics.insets.top, 16),
        bottom: Math.max(initialWindowMetrics.insets.bottom, 12),
      },
    };
  }, []);

  const content = (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: APP_BACKGROUND }}
    >
      <NavigationThemeProvider value={NAVIGATION_THEME}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: APP_BACKGROUND },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="privacy" />
        </Stack>
        <KeyboardDismissButton />
        <AppExperienceOverlay />
        <StatusBar style="light" backgroundColor={APP_BACKGROUND} />
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          {content}
        </SafeAreaProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
