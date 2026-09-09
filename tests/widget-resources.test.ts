import { readFileSync } from "node:fs";
import path from "node:path";
import plist from "@expo/plist";
import { describe, expect, it } from "vitest";

const widgetPath = path.join(process.cwd(), "targets", "ZaymaxNoteWidget");
const bridgePath = path.join(
  process.cwd(),
  "native-packages",
  "zaymax-widget-bridge",
  "ios",
);
const widgetSource = readFileSync(
  path.join(widgetPath, "ZaymaxNoteWidget.swift"),
  "utf8",
);

describe("native widget localization and privacy resources", () => {
  it.each(["de", "en", "pl"])(
    "provides every native widget string in %s",
    (language) => {
      const strings = readFileSync(
        path.join(widgetPath, `${language}.lproj`, "Localizable.strings"),
        "utf8",
      ).replace(/\r\n/g, "\n");
      const entries = new Map(
        [...strings.matchAll(/^"([^"\n]+)"\s*=\s*"([^"\n]+)";$/gm)].map(
          (match) => [match[1], match[2]],
        ),
      );
      const referencedKeys = [
        ...widgetSource.matchAll(/"(widget\.[a-z.]+)"/g),
      ].map((match) => match[1]);

      expect(new Set(referencedKeys).size).toBe(4);
      for (const key of referencedKeys) {
        expect(entries.get(key), `${language}: ${key}`).toBeTruthy();
      }
      const infoStrings = readFileSync(
        path.join(widgetPath, `${language}.lproj`, "InfoPlist.strings"),
        "utf8",
      );
      expect(infoStrings).toContain(
        `"CFBundleDisplayName" = "${entries.get("widget.title")}";`,
      );
    },
  );

  it.each([widgetPath, bridgePath])(
    "declares only shared UserDefaults in the manifest at %s",
    (directory) => {
      const manifest = plist.parse(
        readFileSync(path.join(directory, "PrivacyInfo.xcprivacy"), "utf8"),
      ) as Record<string, unknown>;
      expect(manifest.NSPrivacyAccessedAPITypes).toEqual([
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["1C8F.1"],
        },
      ]);
      expect(manifest.NSPrivacyTracking).toBe(false);
      expect(manifest.NSPrivacyCollectedDataTypes).toEqual([]);
    },
  );

  it("explicitly includes the bridge manifest in the CocoaPods resource bundle", () => {
    const podspec = readFileSync(
      path.join(bridgePath, "ZaymaxWidgetBridge.podspec"),
      "utf8",
    );
    expect(podspec).toMatch(
      /s\.resource_bundles\s*=\s*\{\s*'ZaymaxWidgetBridgePrivacy'\s*=>\s*\['PrivacyInfo\.xcprivacy'\]/,
    );
  });

  it("declares all widget languages and a German fallback without changing its extension type", () => {
    const info = plist.parse(
      readFileSync(path.join(widgetPath, "Info.plist"), "utf8"),
    ) as Record<string, unknown>;
    expect(info.CFBundleLocalizations).toEqual(["de", "en", "pl"]);
    expect(info.CFBundleDevelopmentRegion).toBe("de");
    expect(info.NSExtension).toEqual({
      NSExtensionPointIdentifier: "com.apple.widgetkit-extension",
    });
  });

  it("retains existing note storage keys and the supplied app-language empty text", () => {
    expect(widgetSource).toContain('"zaymax.widget.pinned-note"');
    expect(widgetSource).toContain('"zaymax.widget.empty-label"');
    expect(widgetSource).toContain(
      "defaults?.string(forKey: emptyNoteLabelKey)",
    );
    expect(widgetSource).toContain(
      '.widgetURL(URL(string: "zaymax://reminders"))',
    );
  });
});
