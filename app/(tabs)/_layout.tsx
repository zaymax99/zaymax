import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
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
import { GoldAccent } from "@/components/gold-accent";
import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useColors } from "@/hooks/use-colors";
import { useKeyboardState } from "@/hooks/use-keyboard-state";
import { hapticSelection } from "@/lib/haptics";
import { useLanguage } from "@/lib/i18n";
import { useGlassPreferences } from "@/lib/glass-preferences";
import { getTabBarLayout, TAB_BAR_METRICS } from "@/lib/tab-bar-layout";

const TAB_ICONS: Record<string, ComponentProps<typeof IconSymbol>["name"]> = {
  index: "house.fill",
  reminders: "pencil",
  steps: "shoeprints.fill",
};

function ZaymaxTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { reduceMotion, highContrast } = useGlassPreferences();
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const { isVisible: keyboardVisible } = useKeyboardState();
  const layout = getTabBarLayout({
    screenWidth,
    bottomInset: Platform.OS === "web" ? 0 : insets.bottom,
    fontScale,
  });

  if (keyboardVisible) return null;

  return (
    <View style={[styles.barShell, layout]}>
      <LiquidGlassSurface radius={layout.height / 2} style={styles.barMaterial}>
        <View style={styles.tabRow}>
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
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                accessibilityRole="tab"
                accessibilityState={focused ? { selected: true } : {}}
                testID={options.tabBarButtonTestID}
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
                  focused && styles.tabButtonFocused,
                  focused &&
                    highContrast && {
                      borderColor: colors.foreground,
                      backgroundColor: "#3A3A3C",
                    },
                  pressed && !reduceMotion && styles.tabButtonPressed,
                ]}
              >
                <View style={styles.iconFrame}>
                  <IconSymbol
                    color={color}
                    name={TAB_ICONS[route.name] ?? "circle.fill"}
                    size={16}
                  />
                  {focused ? (
                    <GoldAccent variant="dot" style={styles.activeAccent} />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={TAB_BAR_METRICS.maxFontScale}
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
      </LiquidGlassSurface>
    </View>
  );
}

export default function TabLayout() {
  const { reduceMotion } = useGlassPreferences();
  const colors = useColors("dark");
  const { t } = useLanguage();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        // iOS native glass must not sit below a scene animated to opacity zero.
        animation: Platform.OS === "ios" || reduceMotion ? "none" : "fade",
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
    backgroundColor: "transparent",
    ...ZAYMAX_DESIGN.shadow,
  },
  barMaterial: {
    flex: 1,
  },
  tabRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    padding: TAB_BAR_METRICS.rowPadding,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: TAB_BAR_METRICS.contentGap,
    borderRadius: ZAYMAX_DESIGN.radius.round,
    paddingVertical: TAB_BAR_METRICS.buttonPadding,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  tabButtonFocused: {
    borderColor: ZAYMAX_DESIGN.colors.borderStrong,
    backgroundColor: "rgba(255, 255, 255, 0.09)",
  },
  tabButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  iconFrame: {
    width: 28,
    height: TAB_BAR_METRICS.iconHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  activeAccent: {
    position: "absolute",
    top: 1,
    right: 0,
  },
  tabLabel: {
    width: "100%",
    textAlign: "center",
    fontSize: 10,
    lineHeight: TAB_BAR_METRICS.labelLineHeight,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabLabelFocused: {
    fontWeight: "800",
  },
});
