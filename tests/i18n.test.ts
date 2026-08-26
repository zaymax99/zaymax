import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { appLocaleForLanguage, translate, usesDecimalComma } from "../lib/i18n";
import { POLISH_TRANSLATIONS } from "../lib/i18n-pl";

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return /\.tsx?$/.test(entry.name) ? [filePath] : [];
  });
}

describe("Polish localization", () => {
  it("uses Polish language, locale and decimal formatting", () => {
    expect(translate("Heute", "Today", "pl")).toBe("Dzisiaj");
    expect(translate("Deutsch", "German", "pl", "Niemiecki")).toBe("Niemiecki");
    expect(appLocaleForLanguage("pl")).toBe("pl-PL");
    expect(usesDecimalComma("pl")).toBe(true);
  });

  it("has a Polish value for every static translation call", () => {
    const missing = new Set<string>();
    const roots = ["app", "components", "lib"].map((directory) =>
      path.join(process.cwd(), directory),
    );

    for (const filePath of roots.flatMap(sourceFiles)) {
      const source = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );

      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "t" &&
          node.arguments.length < 3
        ) {
          const german = node.arguments[0];
          if (
            german &&
            (ts.isStringLiteral(german) ||
              ts.isNoSubstitutionTemplateLiteral(german)) &&
            !POLISH_TRANSLATIONS[german.text]
          ) {
            missing.add(german.text);
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(source);
    }

    expect([...missing].sort()).toEqual([]);
  });
});
