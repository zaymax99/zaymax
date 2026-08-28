import type { ExpoConfig } from "expo/config";

const bundleIdentifier = "com.app.zaymax";
const appGroupIdentifier = `group.${bundleIdentifier}`;
const healthReadUsageDescription =
  "Zaymax liest deine Schrittzahlen aus Apple Health, um deine Schritte pro Tag und Woche anzuzeigen. / Zaymax reads your Apple Health step count to show your daily and weekly steps. / Zaymax odczytuje liczbę kroków z Apple Health, aby wyświetlać wyniki dzienne i tygodniowe.";
const healthUpdateUsageDescription =
  "Zaymax verwendet diese HealthKit-Freigabe ausschließlich für die technische Apple-Health-Verbindung. Die App speichert keine Gesundheitsdaten in Apple Health. / Zaymax uses this HealthKit permission only for the technical Apple Health connection. The app does not save health data to Apple Health. / Zaymax używa tego uprawnienia HealthKit wyłącznie do technicznego połączenia z Apple Health. Aplikacja nie zapisuje danych zdrowotnych w Apple Health.";

const config: ExpoConfig = {
  name: "Zaymax",
  slug: "zaymax",
  version: "1.0.2",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "zaymax",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  extra: {
    eas: {
      projectId: "17b1c7dc-33b7-435b-b21b-23c873a5bcfe",
    },
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier,
    appleTeamId: "5VY3JKR7A2",
    entitlements: {
      "com.apple.security.application-groups": [appGroupIdentifier],
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSHealthShareUsageDescription: healthReadUsageDescription,
      NSHealthUpdateUsageDescription: healthUpdateUsageDescription,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSAllowsLocalNetworking: true,
      },
    },
    privacyManifests: {
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#070707",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleIdentifier,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "@bacons/apple-targets",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#070707",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
    [
      "@kingstinct/react-native-healthkit",
      {
        NSHealthShareUsageDescription: healthReadUsageDescription,
        NSHealthUpdateUsageDescription: healthUpdateUsageDescription,
        background: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
