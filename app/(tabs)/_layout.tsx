import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/i18n";

type TabIconProps = {
  color: string;
  focused: boolean;
  name: React.ComponentProps<typeof IconSymbol>["name"];
};

function TabIcon({ color, focused, name }: TabIconProps) {
  return (
    <View style={[styles.iconFrame, focused && styles.iconFrameFocused]}>
      <IconSymbol name={name} size={18} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors("dark");
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 6);
  const barWidth = Math.min(Math.max(screenWidth - 36, 0), 560);
  const barLeft = Math.max((screenWidth - barWidth) / 2, 18);

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
        tabBarLabelPosition: "below-icon",
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
          left: barLeft,
          right: undefined,
          width: barWidth,
          bottom: 7,
          height: 50 + bottomPadding,
          paddingTop: 4,
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
          lineHeight: 13,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          width: "100%",
          height: 27,
          marginTop: 0,
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarItemStyle: {
          height: 46,
          padding: 0,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Heute", "Today"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name="house.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: t("Tagebuch", "Journal"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name="pencil" />
          ),
        }}
      />
      <Tabs.Screen
        name="steps"
        options={{
          title: t("Schritte", "Steps"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name="shoeprints.fill" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    width: 32,
    height: 26,
    borderRadius: ZAYMAX_DESIGN.radius.round,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  iconFrameFocused: {
    borderColor: ZAYMAX_DESIGN.colors.borderStrong,
    backgroundColor: "rgba(255, 255, 255, 0.075)",
  },
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
