import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Platform } from "react-native";

const initialPreferences = {
  reduceMotion: true,
  reduceTransparency: true,
  highContrast: false,
};

const GlassPreferencesContext = createContext(initialPreferences);

export function GlassPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);

  useEffect(() => {
    let active = true;
    const setPreference = (
      key: keyof typeof initialPreferences,
      value: boolean,
    ) => {
      if (active) setPreferences((current) => ({ ...current, [key]: value }));
    };

    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      const queries = [
        ["reduceMotion", "(prefers-reduced-motion: reduce)"],
        ["reduceTransparency", "(prefers-reduced-transparency: reduce)"],
        ["highContrast", "(prefers-contrast: more)"],
      ] as const;
      const cleanups = queries.map(([key, query]) => {
        const media = window.matchMedia(query);
        const update = () => setPreference(key, media.matches);
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
      });
      return () => {
        active = false;
        cleanups.forEach((cleanup) => cleanup());
      };
    }

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => setPreference("reduceMotion", value))
      .catch(() => undefined);
    const subscriptions = [
      AccessibilityInfo.addEventListener("reduceMotionChanged", (value) =>
        setPreference("reduceMotion", value),
      ),
    ];
    if (Platform.OS === "ios") {
      void AccessibilityInfo.isReduceTransparencyEnabled()
        .then((value) => setPreference("reduceTransparency", value))
        .catch(() => undefined);
      void AccessibilityInfo.isDarkerSystemColorsEnabled()
        .then((value) => setPreference("highContrast", value))
        .catch(() => undefined);
      subscriptions.push(
        AccessibilityInfo.addEventListener(
          "reduceTransparencyChanged",
          (value) => setPreference("reduceTransparency", value),
        ),
        AccessibilityInfo.addEventListener(
          "darkerSystemColorsChanged",
          (value) => setPreference("highContrast", value),
        ),
      );
    } else {
      setPreference("reduceTransparency", false);
    }
    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  return (
    <GlassPreferencesContext.Provider value={preferences}>
      {children}
    </GlassPreferencesContext.Provider>
  );
}

export function useGlassPreferences() {
  return useContext(GlassPreferencesContext);
}
