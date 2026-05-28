import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "inkos:studio:theme";

interface ThemeStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getThemeStorage(): ThemeStorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredTheme(storage: Pick<ThemeStorageLike, "getItem"> | null | undefined): Theme | null {
  const storedTheme = storage?.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
}

export function resolveThemePreference({ storedTheme }: {
  readonly hour: number;
  readonly storedTheme: Theme | null;
}): Theme {
  return storedTheme ?? "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    resolveThemePreference({
      hour: new Date().getHours(),
      storedTheme: readStoredTheme(getThemeStorage()),
    }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const storedTheme = readStoredTheme(getThemeStorage());
      setThemeState(resolveThemePreference({
        hour: new Date().getHours(),
        storedTheme,
      }));
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    const storage = getThemeStorage();
    try {
      storage?.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage failures and keep the in-memory preference for this session.
    }
    setThemeState(nextTheme);
  };

  return { theme, setTheme };
}
