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
          height: 66 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          borderTopLeftRadius: ZAYMAX_DESIGN.radius.card,
          borderTopRightRadius: ZAYMAX_DESIGN.radius.card,
          overflow: "hidden",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
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
                width: 38,
                height: 38,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? colors.foreground : "transparent",
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
                width: 38,
                height: 38,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? colors.foreground : "transparent",
                backgroundColor: focused ? colors.background : "transparent",
              }}
            >
              <IconSymbol name="pencil" size={21} color={color} />
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
                width: 38,
                height: 38,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? colors.foreground : "transparent",
                backgroundColor: focused ? colors.background : "transparent",
              }}
            >
              <IconSymbol name="shoeprints.fill" size={21} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
