import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppLanguage = "de" | "en";

type LanguageContextValue = {
  language: AppLanguage;
  locale: "de-DE" | "en-US";
  ready: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (german: string, english: string) => string;
};

export const LANGUAGE_STORAGE_KEY = "zaymax.language.v1";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("de");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) => setLanguageState(saved === "en" ? "en" : "de"))
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const t = useCallback(
    (german: string, english: string) => (language === "de" ? german : english),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale: language === "de" ? "de-DE" : "en-US",
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

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
