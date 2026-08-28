import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { hapticSelection } from "@/lib/haptics";
import { useLanguage } from "@/lib/i18n";

const TAB_ICONS: Record<string, ComponentProps<typeof IconSymbol>["name"]> = {
  index: "house.fill",
  reminders: "pencil",
  steps: "shoeprints.fill",
};

function ZaymaxTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 6);
  const barWidth = Math.min(Math.max(screenWidth - 36, 0), 560);
  const barLeft = Math.max((screenWidth - barWidth) / 2, 18);

  return (
    <View
      style={[
        styles.barShell,
        {
          bottom: 7,
          height: 50 + bottomPadding,
          left: barLeft,
          width: barWidth,
        },
      ]}
    >
      <View pointerEvents="none" style={styles.barClip}>
        <BlurView
          tint="dark"
          intensity={Platform.OS === "ios" ? 48 : 34}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.barSmoke]} />
        <View style={styles.barReflection} />
      </View>

      <View style={[styles.tabRow, { paddingBottom: bottomPadding }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : route.name;
          const color = focused ? colors.foreground : colors.muted;

          return (
            <Pressable
              accessibilityLabel={options.tabBarAccessibilityLabel}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              key={route.key}
              onLongPress={() => {
                navigation.emit({
                  type: "tabLongPress",
                  target: route.key,
                });
              }}
              onPress={() => {
                hapticSelection();
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={({ pressed }) => [
                styles.tabButton,
                pressed && styles.tabButtonPressed,
              ]}
            >
              <View
                style={[styles.iconFrame, focused && styles.iconFrameFocused]}
              >
                <IconSymbol
                  color={color}
                  name={TAB_ICONS[route.name] ?? "circle.fill"}
                  size={18}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  { color },
                  focused && styles.tabLabelFocused,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors("dark");
  const { t } = useLanguage();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        animation: "fade",
        headerShown: false,
        lazy: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarHideOnKeyboard: true,
        transitionSpec: {
          animation: "timing",
          config: { duration: ZAYMAX_DESIGN.motion.quick },
        },
      }}
      tabBar={(props) => <ZaymaxTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t("Heute", "Today") }} />
      <Tabs.Screen
        name="reminders"
        options={{ title: t("Tagebuch", "Journal") }}
      />
      <Tabs.Screen name="steps" options={{ title: t("Schritte", "Steps") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barShell: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ZAYMAX_DESIGN.colors.borderStrong,
    borderTopColor: ZAYMAX_DESIGN.colors.glassReflection,
    borderRadius: ZAYMAX_DESIGN.radius.hero,
    backgroundColor: "transparent",
    ...ZAYMAX_DESIGN.shadow,
  },
  barClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: ZAYMAX_DESIGN.radius.hero,
  },
  barSmoke: {
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
  tabRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    paddingTop: 4,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
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
  tabLabel: {
    width: "100%",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabLabelFocused: {
    fontWeight: "800",
  },
});
