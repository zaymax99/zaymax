type GlassRuntime = {
  isLiquidGlassAvailable: () => boolean;
  isGlassEffectAPIAvailable: () => boolean;
};

// Older installed binaries can receive JS that references a native module they
// do not yet contain. Never load its view manager until support is confirmed.
export function loadSupportedGlass<T extends GlassRuntime>(
  platform: string,
  load: () => T | null,
): T | null {
  if (platform !== "ios") return null;
  try {
    const runtime = load();
    return runtime?.isLiquidGlassAvailable() &&
      runtime.isGlassEffectAPIAvailable()
      ? runtime
      : null;
  } catch {
    return null;
  }
}
