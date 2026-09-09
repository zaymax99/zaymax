import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import { useGlassPreferences } from "@/lib/glass-preferences";

type GlassMaterialProps = {
  intensity?: number;
  radius?: number;
  raised?: boolean;
};

export function GlassMaterial({
  intensity = 26,
  radius = ZAYMAX_DESIGN.radius.card,
  raised = false,
}: GlassMaterialProps) {
  const { reduceTransparency, highContrast } = useGlassPreferences();
  const opaque = reduceTransparency || highContrast;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: radius, overflow: "hidden" },
      ]}
    >
      {!opaque && (
        <BlurView
          tint="systemUltraThinMaterialDark"
          intensity={intensity}
          experimentalBlurMethod={
            Platform.OS === "android" ? "dimezisBlurView" : "none"
          }
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: opaque
              ? raised
                ? "#242427"
                : "#19191C"
              : raised
                ? ZAYMAX_DESIGN.colors.surfaceRaised
                : ZAYMAX_DESIGN.colors.surface,
          },
        ]}
      />
      {highContrast && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, borderWidth: 1, borderColor: "#8E8E93" },
          ]}
        />
      )}
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 20,
          left: 20,
          height: StyleSheet.hairlineWidth,
          backgroundColor: ZAYMAX_DESIGN.colors.glassReflection,
        }}
      />
    </View>
  );
}
