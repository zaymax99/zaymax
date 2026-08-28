import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
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
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);

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
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <BlurView
              tint="dark"
              intensity={Platform.OS === "ios" ? 48 : 34}
              style={[StyleSheet.absoluteFill, styles.barMaterial]}
            />
            <View style={[StyleSheet.absoluteFill, styles.barSmoke]} />
            <View style={styles.barReflection} />
          </View>
        ),
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 6,
          height: 60 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          backgroundColor: "transparent",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: ZAYMAX_DESIGN.colors.borderStrong,
          borderTopColor: ZAYMAX_DESIGN.colors.glassReflection,
          borderRadius: ZAYMAX_DESIGN.radius.hero,
          ...ZAYMAX_DESIGN.shadow,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: 2,
          marginBottom: 1,
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
                width: 36,
                height: 30,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? StyleSheet.hairlineWidth : 0,
                borderColor: focused
                  ? ZAYMAX_DESIGN.colors.borderStrong
                  : "transparent",
                backgroundColor: focused
                  ? "rgba(255, 255, 255, 0.075)"
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
                width: 36,
                height: 30,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? StyleSheet.hairlineWidth : 0,
                borderColor: focused
                  ? ZAYMAX_DESIGN.colors.borderStrong
                  : "transparent",
                backgroundColor: focused
                  ? "rgba(255, 255, 255, 0.075)"
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
                width: 36,
                height: 30,
                borderRadius: ZAYMAX_DESIGN.radius.round,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? StyleSheet.hairlineWidth : 0,
                borderColor: focused
                  ? ZAYMAX_DESIGN.colors.borderStrong
                  : "transparent",
                backgroundColor: focused
                  ? "rgba(255, 255, 255, 0.075)"
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

const styles = StyleSheet.create({
  barMaterial: {
    overflow: "hidden",
    borderRadius: ZAYMAX_DESIGN.radius.hero,
  },
  barSmoke: {
    borderRadius: ZAYMAX_DESIGN.radius.hero,
    backgroundColor: ZAYMAX_DESIGN.colors.glassNavigation,
  },
  barReflection: {
    position: "absolute",
    top: 0,
    right: 24,
    left: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: ZAYMAX_DESIGN.colors.glassReflection,
  },
});
