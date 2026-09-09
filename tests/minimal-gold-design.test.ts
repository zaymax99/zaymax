import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { ZAYMAX_DESIGN } from "../constants/zaymax-design";

const { themeColors } = createRequire(import.meta.url)(
  "../theme.config.js",
) as {
  themeColors: Record<string, { light: string; dark: string }>;
};

const surfaceProperties = new Set([
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "shadowColor",
  "tintColor",
  "stopColor",
  "fill",
]);

function childrenOf(node: ts.Node): ts.Node[] {
  const children: ts.Node[] = [];
  ts.forEachChild(node, (child) => {
    children.push(child);
  });
  return children;
}

function rgb(value: string): number[] | null {
  const hex = /^#([\da-f]{6})(?:[\da-f]{2})?$/i.exec(value);
  if (hex) {
    return [0, 2, 4].map((offset) =>
      parseInt(hex[1].slice(offset, offset + 2), 16),
    );
  }
  const functional = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/i.exec(value);
  return functional ? functional.slice(1, 4).map(Number) : null;
}

function isGoldLiteral(value: string): boolean {
  const color = rgb(value);
  if (!color) return false;
  const [red, green, blue] = color;
  return red > green + 8 && green > blue + 18 && red - blue >= 45;
}

function propertyName(node: ts.PropertyName): string | undefined {
  return ts.isIdentifier(node) || ts.isStringLiteral(node)
    ? node.text
    : undefined;
}

function numericOptions(node: ts.Expression | undefined): number[] {
  if (!node) return [];
  if (ts.isNumericLiteral(node)) return [Number(node.text)];
  if (ts.isConditionalExpression(node)) {
    const yes = numericOptions(node.whenTrue);
    const no = numericOptions(node.whenFalse);
    return yes.length && no.length ? [...yes, ...no] : [];
  }
  return [];
}

function objectProperty(object: ts.ObjectLiteralExpression, name: string) {
  return object.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && propertyName(property.name) === name,
  )?.initializer;
}

/** Static guard for visual regressions, not a replacement for native UI QA. */
function goldSurfaceViolations(filename: string, source: string): string[] {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const bindings = new Map<string, ts.Expression>();
  const collect = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      bindings.set(node.name.text, node.initializer);
    }
    childrenOf(node).forEach(collect);
  };
  collect(file);

  const containsGold = (node: ts.Node, seen = new Set<string>()): boolean => {
    if (ts.isStringLiteralLike(node)) return isGoldLiteral(node.text);
    if (ts.isPropertyAccessExpression(node)) {
      // BMI's yellow range is health information, not decorative progress gold.
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "BMI_COLORS"
      ) {
        return false;
      }
      if (/^gold/i.test(node.name.text)) return true;
    }
    if (ts.isIdentifier(node)) {
      if (node.text === "BMI_COLORS") return false;
      if (/gold/i.test(node.text)) return true;
      if (!seen.has(node.text) && bindings.has(node.text)) {
        return containsGold(
          bindings.get(node.text)!,
          new Set([...seen, node.text]),
        );
      }
    }
    return childrenOf(node).some((child) => containsGold(child, seen));
  };

  const isSmallConfetti = (node: ts.PropertyAssignment): boolean => {
    if (propertyName(node.name) !== "backgroundColor") return false;
    if (!ts.isObjectLiteralExpression(node.parent)) return false;
    let parent: ts.Node | undefined = node.parent;
    while (parent && !ts.isFunctionDeclaration(parent)) parent = parent.parent;
    if (
      !parent ||
      !ts.isFunctionDeclaration(parent) ||
      !["ConfettiPiece", "FallingConfetti"].includes(parent.name?.text ?? "")
    ) {
      return false;
    }
    return ["width", "height"].every((dimension) => {
      const options = numericOptions(
        objectProperty(node.parent as ts.ObjectLiteralExpression, dimension),
      );
      return (
        options.length > 0 && options.every((size) => size > 0 && size <= 10)
      );
    });
  };

  const violations: string[] = [];
  const visit = (node: ts.Node) => {
    const property = ts.isPropertyAssignment(node)
      ? propertyName(node.name)
      : ts.isJsxAttribute(node)
        ? node.name.getText(file)
        : undefined;
    const value =
      ts.isPropertyAssignment(node) || ts.isJsxAttribute(node)
        ? node.initializer
        : undefined;
    if (
      property &&
      value &&
      surfaceProperties.has(property) &&
      containsGold(value)
    ) {
      const microAccent =
        filename === "components/gold-accent.tsx" &&
        property === "backgroundColor";
      if (
        !microAccent &&
        !(ts.isPropertyAssignment(node) && isSmallConfetti(node))
      ) {
        const { line } = file.getLineAndCharacterOfPosition(
          node.getStart(file),
        );
        violations.push(`${filename}:${line + 1} ${property}`);
      }
    }
    childrenOf(node).forEach(visit);
  };
  visit(file);
  return violations;
}

function appFiles(directory: string): string[] {
  return readdirSync(path.join(process.cwd(), directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const filename = `${directory}/${entry.name}`;
    return entry.isDirectory()
      ? appFiles(filename)
      : /\.tsx?$/.test(entry.name)
        ? [filename]
        : [];
  });
}

describe("minimal progress-gold design", () => {
  it("keeps page, card, control and navigation materials neutral", () => {
    const neutralKeys = [
      "background",
      "backgroundRaised",
      "surface",
      "surfaceRaised",
      "surfaceSoft",
      "glassNavigation",
      "glassReflection",
      "action",
      "border",
      "borderStrong",
      "overlay",
    ] as const;
    for (const key of neutralKeys) {
      const color = rgb(ZAYMAX_DESIGN.colors[key]);
      expect(color, key).not.toBeNull();
      expect(
        Math.max(...color!) - Math.min(...color!),
        key,
      ).toBeLessThanOrEqual(8);
    }
    for (const key of [
      "primary",
      "background",
      "surface",
      "foreground",
      "border",
    ]) {
      for (const mode of ["light", "dark"] as const) {
        const color = rgb(themeColors[key][mode]);
        expect(color, `${key}.${mode}`).not.toBeNull();
        expect(
          Math.max(...color!) - Math.min(...color!),
          `${key}.${mode}`,
        ).toBeLessThanOrEqual(8);
      }
    }
  });

  it("never uses gold for surfaces, large borders, glass tint, global glows or primary actions", () => {
    const violations = [...appFiles("app"), ...appFiles("components")].flatMap(
      (filename) =>
        goldSurfaceViolations(
          filename,
          readFileSync(path.join(process.cwd(), filename), "utf8"),
        ),
    );
    expect(violations).toEqual([]);
  });

  it("keeps the shared decorative accent tiny, non-interactive and bounded after custom spacing", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/gold-accent.tsx"),
      "utf8",
    );
    expect(source).toMatch(/line:\s*\{\s*width:\s*14,\s*height:\s*2\s*\}/);
    expect(source).toMatch(/dot:\s*\{\s*width:\s*4,\s*height:\s*4\s*\}/);
    expect(source).toContain('pointerEvents="none"');
    expect(source).toContain("accessible={false}");
    expect(source).toMatch(
      /styles\.accent,\s*style,\s*variant === "dot" \? styles\.dot : styles\.line/,
    );
  });

  it("detects aliased colors, transparent gold fills and native tint props", () => {
    const source = `
      const GOLD_FILL = "rgba(195, 163, 107, 0.08)";
      const CONFETTI_COLORS = [ZAYMAX_DESIGN.colors.gold, "#FFFFFF"];
      const style = { backgroundColor: GOLD_FILL, borderColor: "#C3A36B" };
      const balloon = { width: 46, height: 46, backgroundColor: CONFETTI_COLORS[0] };
      const view = <GlassView tintColor={ZAYMAX_DESIGN.colors.gold} />;
    `;
    expect(goldSurfaceViolations("example.tsx", source)).toHaveLength(4);
  });

  it("allows semantic BMI warning colors, text/icons and genuinely small confetti only", () => {
    const source = `
      const BMI_COLORS = { elevated: "#F2B84B" };
      const bmi = { backgroundColor: BMI_COLORS.elevated };
      const warning = { backgroundColor: colors.warning };
      const progress = { color: ZAYMAX_DESIGN.colors.gold };
      function ConfettiPiece() {
        return <View style={{ width: 4, height: index % 2 ? 4 : 3, backgroundColor: ZAYMAX_DESIGN.colors.gold }} />;
      }
      function FallingConfetti() {
        return <View style={{ width: 40, height: 40, backgroundColor: ZAYMAX_DESIGN.colors.gold }} />;
      }
    `;
    expect(goldSurfaceViolations("example.tsx", source)).toHaveLength(1);
  });
});
