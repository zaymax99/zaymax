import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";

export default function TabLayout() {
  const colors = useColors("dark");
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        lazy: false,
        animation: "fade",
        transitionSpec: {
          animation: "timing",
          config: { duration: 180 },
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 64 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: `${colors.surface}F5`,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.7,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Heute", "Today"),
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 42,
                height: 32,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: colors.border,
                backgroundColor: focused ? colors.background : "transparent",
              }}
            >
              <IconSymbol name="house.fill" size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: t("Tagebuch", "Journal"),
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 42,
                height: 32,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: colors.border,
                backgroundColor: focused ? colors.background : "transparent",
              }}
            >
              <IconSymbol name="pencil" size={21} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
