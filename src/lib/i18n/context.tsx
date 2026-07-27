"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Lang } from "./dict";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = "lbl.lang";
const DEFAULT_LANG: Lang = "en";

const subscribers = new Set<() => void>();

function emit() {
  for (const cb of subscribers) cb();
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function readStoredLang(): Lang {
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "en" || v === "es" ? v : DEFAULT_LANG;
}

function writeStoredLang(lang: Lang) {
  window.localStorage.setItem(STORAGE_KEY, lang);
  emit();
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(
    subscribe,
    readStoredLang,
    () => DEFAULT_LANG,
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    writeStoredLang(l);
  }, []);

  const toggle = useCallback(() => {
    writeStoredLang(readStoredLang() === "en" ? "es" : "en");
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, toggle }),
    [lang, setLang, toggle],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within <LangProvider>");
  return ctx;
}
