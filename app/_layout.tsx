import "@/global.css";
import {
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/i18n";
import { KeyboardDismissButton } from "@/components/keyboard-dismiss-button";
import { AppExperienceOverlay } from "@/components/app-experience-overlay";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

const APP_BACKGROUND = "#0C0D0F";
const NAVIGATION_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#D8B963",
    background: APP_BACKGROUND,
    card: "#18191C",
    text: "#F4F4F5",
    border: "#2A2C30",
    notification: "#D8B963",
  },
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
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
