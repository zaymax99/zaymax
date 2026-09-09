import { requireOptionalNativeModule } from "expo";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useGlassPreferences } from "@/lib/glass-preferences";
import { loadSupportedGlass } from "@/lib/liquid-glass";

const nativeGlass = loadSupportedGlass(Platform.OS, () => {
  const nativeModule = requireOptionalNativeModule<{
    isLiquidGlassAvailable: boolean;
    isGlassEffectAPIAvailable: boolean;
  }>("ExpoGlassEffect");
  if (
    !nativeModule?.isLiquidGlassAvailable ||
    !nativeModule.isGlassEffectAPIAvailable
  ) {
    return null;
  }
  // Keep the native view registration out of old binaries and web rendering.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-glass-effect") as typeof import("expo-glass-effect");
});

type LiquidGlassSurfaceProps = ViewProps & {
  radius?: number;
  isInteractive?: boolean;
};

/** Navigation/control material. Content cards continue to use GlassMaterial. */
export function LiquidGlassSurface({
  children,
  radius = ZAYMAX_DESIGN.radius.round,
  isInteractive = false,
  style,
  ...props
}: LiquidGlassSurfaceProps) {
  const { reduceTransparency, highContrast } = useGlassPreferences();
  const opaque = reduceTransparency || highContrast;
  const NativeGlassView = nativeGlass?.GlassView;

  if (NativeGlassView && !opaque) {
    return (
      <NativeGlassView
        {...props}
        glassEffectStyle="regular"
        colorScheme="dark"
        isInteractive={isInteractive}
        style={[{ borderRadius: radius, borderCurve: "continuous" }, style]}
      >
        {children}
      </NativeGlassView>
    );
  }

  return (
    <View
      {...props}
      style={[{ borderRadius: radius, borderCurve: "continuous" }, style]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.fallback,
          {
            borderRadius: radius,
            borderColor: highContrast
              ? "#8E8E93"
              : ZAYMAX_DESIGN.colors.borderStrong,
            backgroundColor: opaque ? "#222225" : "transparent",
          },
        ]}
      >
        {!opaque && (
          <>
            <BlurView
              tint="systemMaterialDark"
              intensity={65}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, styles.smoke]} />
            <View style={styles.reflection} />
          </>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  smoke: { backgroundColor: "rgba(25, 25, 29, 0.46)" },
  reflection: {
    position: "absolute",
    top: 0,
    left: "14%",
    right: "14%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.26)",
  },
});
