import type { ExpoConfig } from "expo/config";

const bundleIdentifier = "com.app.zaymax";

const config: ExpoConfig = {
  name: "Zaymax",
  slug: "zaymax",
  version: "1.0.1",
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
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
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
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#070707",
        dark: {
          backgroundColor: "#070707",
        },
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
        NSHealthShareUsageDescription:
          "Zaymax liest deine Schrittzahlen aus Apple Health, um deine Schritte pro Tag und Woche anzuzeigen. / Zaymax reads your Apple Health step count to show your daily and weekly steps.",
        NSHealthUpdateUsageDescription: false,
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
