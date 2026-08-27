import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
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
          config: { duration: ZAYMAX_DESIGN.motion.quick },
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 72 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: ZAYMAX_DESIGN.colors.surfaceRaised,
          borderTopColor: colors.border,
          borderTopWidth: 0.75,
          borderTopLeftRadius: ZAYMAX_DESIGN.radius.card,
          borderTopRightRadius: ZAYMAX_DESIGN.radius.card,
          overflow: "hidden",
          ...ZAYMAX_DESIGN.shadow,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: 3,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          height: 32,
          marginTop: 1,
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
                width: 32,
                height: 32,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: focused
                  ? ZAYMAX_DESIGN.colors.goldLine
                  : "transparent",
                backgroundColor: focused
                  ? ZAYMAX_DESIGN.colors.goldSoft
                  : "transparent",
              }}
            >
              <IconSymbol name="house.fill" size={18} color={color} />
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
                width: 32,
                height: 32,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: focused
                  ? ZAYMAX_DESIGN.colors.goldLine
                  : "transparent",
                backgroundColor: focused
                  ? ZAYMAX_DESIGN.colors.goldSoft
                  : "transparent",
              }}
            >
              <IconSymbol name="pencil" size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="steps"
        options={{
          title: t("Schritte", "Steps"),
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: focused
                  ? ZAYMAX_DESIGN.colors.goldLine
                  : "transparent",
                backgroundColor: focused
                  ? ZAYMAX_DESIGN.colors.goldSoft
                  : "transparent",
              }}
            >
              <IconSymbol name="shoeprints.fill" size={18} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
