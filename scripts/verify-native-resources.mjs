import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Generate only a disposable native project. This never builds, signs, installs,
// uploads, or modifies the app's real ios/ directory or its checked-in files.
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const require = createRequire(path.join(projectRoot, "package.json"));
const plist = require("@expo/plist").default;
if (process.platform === "win32") {
  console.error(
    "Expo iOS prebuild requires macOS or Linux. Run this verification there; no native build or packaging was verified on Windows.",
  );
  process.exit(2);
}
const temporaryRoot = mkdtempSync(
  path.join(tmpdir(), "zaymax-native-resources-"),
);
for (const item of [
  "app.config.ts",
  "package.json",
  "assets",
  "targets",
  "native-packages",
]) {
  cpSync(path.join(projectRoot, item), path.join(temporaryRoot, item), {
    recursive: true,
  });
}
symlinkSync(
  path.join(projectRoot, "node_modules"),
  path.join(temporaryRoot, "node_modules"),
  "junction",
);

console.log(`Isolated native project: ${temporaryRoot}`);
const result = spawnSync(
  process.execPath,
  [
    path.join(projectRoot, "node_modules", "expo", "bin", "cli"),
    "prebuild",
    "--platform",
    "ios",
    "--no-install",
    "--skip-dependency-update",
    "expo,react,react-native",
  ],
  {
    cwd: temporaryRoot,
    env: { ...process.env, CI: "1", EXPO_NO_GIT_STATUS: "1" },
    encoding: "utf8",
  },
);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);

const iosRoot = path.join(temporaryRoot, "ios");
const projectDirectory = readdirSync(iosRoot).find((name) =>
  name.endsWith(".xcodeproj"),
);
assert(projectDirectory, "Generated Xcode project is missing");
const project = readFileSync(
  path.join(iosRoot, projectDirectory, "project.pbxproj"),
  "utf8",
);
assert.match(project, /PBXFileSystemSynchronizedRootGroup/);
assert.match(project, /path = ZaymaxNoteWidget;/);
assert.match(
  project,
  /fileSystemSynchronizedGroups = \([\s\S]*?\/\* ZaymaxNoteWidget \*\//,
);
assert(
  !/membershipExceptions = \([^)]*(?:PrivacyInfo|\.lproj)/s.test(project),
  "Native widget resources were excluded from its synchronized group",
);

const appDirectory = projectDirectory.slice(0, -".xcodeproj".length);
const appManifest = plist.parse(
  readFileSync(
    path.join(iosRoot, appDirectory, "PrivacyInfo.xcprivacy"),
    "utf8",
  ),
);
assert(
  appManifest.NSPrivacyAccessedAPITypes.some(
    (entry) =>
      entry.NSPrivacyAccessedAPIType ===
        "NSPrivacyAccessedAPICategoryUserDefaults" &&
      entry.NSPrivacyAccessedAPITypeReasons.includes("1C8F.1"),
  ),
  "App Group UserDefaults declaration missing from generated app manifest",
);

const widgetRoot = path.join(temporaryRoot, "targets", "ZaymaxNoteWidget");
for (const language of ["de", "en", "pl"]) {
  assert(
    existsSync(
      path.join(widgetRoot, `${language}.lproj`, "Localizable.strings"),
    ),
  );
  assert(
    existsSync(path.join(widgetRoot, `${language}.lproj`, "InfoPlist.strings")),
  );
}
assert(existsSync(path.join(widgetRoot, "PrivacyInfo.xcprivacy")));
const podspec = readFileSync(
  path.join(
    temporaryRoot,
    "native-packages",
    "zaymax-widget-bridge",
    "ios",
    "ZaymaxWidgetBridge.podspec",
  ),
  "utf8",
);
assert.match(
  podspec,
  /s\.resource_bundles\s*=\s*\{\s*'ZaymaxWidgetBridgePrivacy'\s*=>\s*\['PrivacyInfo\.xcprivacy'\]/,
);

console.log(
  "PASS: generated app manifest and synchronized widget resources are included; bridge resource bundle is explicitly configured.",
);
console.log(
  "Not checked: CocoaPods/Xcode compilation, code signing, or on-device widget behavior (requires macOS/iPhone).",
);
