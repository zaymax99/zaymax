import { View, type ViewProps } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { cn } from "@/lib/utils";

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the background color,
 * while the inner SafeAreaView ensures content is within safe bounds.
 *
 * Usage:
 * ```tsx
 * <ScreenContainer className="p-4">
 *   <Text className="text-2xl font-bold text-foreground">
 *     Welcome
 *   </Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  ...props
}: ScreenContainerProps) {
  return (
    <View
      className={cn("flex-1", "bg-background", containerClassName)}
      {...props}
    >
      <SmokedGlassBackdrop />
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={style}
      >
        <View className={cn("flex-1", className)}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

function SmokedGlassBackdrop() {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="topReflection" cx="10%" cy="0%" r="78%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.05} />
            <Stop offset="44%" stopColor="#767983" stopOpacity={0.018} />
            <Stop offset="100%" stopColor="#070707" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="sideReflection" cx="100%" cy="38%" r="68%">
            <Stop offset="0%" stopColor="#777B86" stopOpacity={0.03} />
            <Stop offset="100%" stopColor="#070707" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={ZAYMAX_DESIGN.colors.background}
        />
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#topReflection)"
        />
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#sideReflection)"
        />
      </Svg>
    </View>
  );
}
