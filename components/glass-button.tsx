import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { LiquidGlassSurface } from "@/components/liquid-glass-surface";
import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useGlassPreferences } from "@/lib/glass-preferences";

type GlassButtonProps = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  radius?: number;
};

export function GlassButton({
  children,
  style,
  surfaceStyle,
  radius = ZAYMAX_DESIGN.radius.round,
  disabled,
  accessibilityState,
  ...props
}: GlassButtonProps) {
  const { reduceMotion } = useGlassPreferences();
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      style={({ pressed }) => [
        { borderRadius: radius },
        style,
        disabled && { opacity: 0.45 },
        pressed && !reduceMotion && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <LiquidGlassSurface
        isInteractive={!disabled}
        radius={radius}
        style={[styles.content, surfaceStyle]}
      >
        {children}
      </LiquidGlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});
