import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { polishTranslationFor } from "./i18n-pl";

export type AppLanguage = "de" | "en" | "pl";
export type AppLocale = "de-DE" | "en-US" | "pl-PL";

type LanguageContextValue = {
  language: AppLanguage;
  locale: AppLocale;
  ready: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (german: string, english: string, polish?: string) => string;
};

export const LANGUAGE_STORAGE_KEY = "zaymax.language.v1";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("de");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) =>
        setLanguageState(saved === "en" || saved === "pl" ? saved : "de"),
      )
      .catch(() => setLanguageState("de"))
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (german: string, english: string, polish?: string) =>
      translate(german, english, language, polish),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale: appLocaleForLanguage(language),
      ready,
      setLanguage,
      t,
    }),
    [language, ready, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {ready ? children : null}
    </LanguageContext.Provider>
  );
}

export function appLocaleForLanguage(language: AppLanguage): AppLocale {
  if (language === "pl") return "pl-PL";
  return language === "de" ? "de-DE" : "en-US";
}

export function usesDecimalComma(language: AppLanguage) {
  return language === "de" || language === "pl";
}

export function translate(
  german: string,
  english: string,
  language: AppLanguage,
  polish?: string,
) {
  if (language === "de") return german;
  if (language === "en") return english;
  return polish ?? polishTranslationFor(german) ?? english;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
