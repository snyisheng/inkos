import { describe, expect, it } from "vitest";
import { readStoredTheme, resolveThemePreference } from "./use-theme";

describe("resolveThemePreference", () => {
  it("keeps a stored manual light theme during night hours", () => {
    expect(resolveThemePreference({ hour: 23, storedTheme: "light" })).toBe("light");
  });

  it("defaults to the StoryPilot dark command deck when no manual theme is stored", () => {
    expect(resolveThemePreference({ hour: 23, storedTheme: null })).toBe("dark");
    expect(resolveThemePreference({ hour: 9, storedTheme: null })).toBe("dark");
  });
});

describe("readStoredTheme", () => {
  it("accepts only light and dark values from storage", () => {
    expect(readStoredTheme({ getItem: () => "light" })).toBe("light");
    expect(readStoredTheme({ getItem: () => "dark" })).toBe("dark");
    expect(readStoredTheme({ getItem: () => "auto" })).toBeNull();
    expect(readStoredTheme({ getItem: () => null })).toBeNull();
  });
});
