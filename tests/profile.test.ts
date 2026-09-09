import { describe, expect, it } from "vitest";

import {
  bmiLevel,
  calculateAge,
  calculateBmi,
  formatBirthDate,
  formatBirthDateInput,
  isBirthdayToday,
  parseBirthDateInput,
  parseDecimalInput,
} from "../lib/profile";

describe("profile calculations", () => {
  it("accepts German decimal commas", () => {
    expect(parseDecimalInput("22,5")).toBe(22.5);
    expect(parseDecimalInput("81.3 kg")).toBe(81.3);
  });

  it("parses and validates German birthday input", () => {
    expect(parseBirthDateInput("07.04.1998")).toBe("1998-04-07");
    expect(parseBirthDateInput("31.02.2000")).toBeUndefined();
  });

  it.each(["1999-07-10", "1999-07-27", "2000-02-29"])(
    "preserves birthday %s when reopening and saving the English profile",
    (birthDate) => {
      const editableDate = formatBirthDateInput(birthDate);
      expect(parseBirthDateInput(editableDate)).toBe(birthDate);
      expect(editableDate).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    },
  );

  it("keeps English display dates localized without using them as editable input", () => {
    expect(formatBirthDate("1999-07-10", "en-US")).toBe("07/10/1999");
    expect(formatBirthDateInput("1999-07-10")).toBe("10.07.1999");
    expect(formatBirthDateInput()).toBe("");
    expect(formatBirthDateInput("invalid")).toBe("");
  });

  it("calculates BMI and its visual range", () => {
    expect(calculateBmi({ weightKg: 75, heightCm: 180 })).toBe(23.1);
    expect(bmiLevel(17.9)).toBe("low");
    expect(bmiLevel(23.1)).toBe("healthy");
    expect(bmiLevel(27)).toBe("elevated");
    expect(bmiLevel(32)).toBe("high");
  });

  it("calculates age and recognizes birthdays without timezone shifts", () => {
    const date = new Date(2026, 3, 7, 12);
    expect(calculateAge("1998-04-07", date)).toBe(28);
    expect(isBirthdayToday("1998-04-07", date)).toBe(true);
    expect(isBirthdayToday("1998-04-08", date)).toBe(false);
  });
});
