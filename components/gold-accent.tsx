import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";

type GoldAccentProps = {
  variant?: "line" | "dot";
  style?: StyleProp<ViewStyle>;
};

/** Decorative micro-accent; never a surface, border or interactive control. */
export function GoldAccent({ variant = "line", style }: GoldAccentProps) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.accent,
        style,
        variant === "dot" ? styles.dot : styles.line,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  accent: {
    backgroundColor: ZAYMAX_DESIGN.colors.gold,
    borderRadius: 999,
    flexShrink: 0,
    opacity: 0.85,
  },
  line: { width: 14, height: 2 },
  dot: { width: 4, height: 4 },
});
