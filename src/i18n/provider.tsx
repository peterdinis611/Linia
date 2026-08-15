"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages/en";
import { translate, translatePlural } from "./translate";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tp: (
    key: keyof Messages["plural"],
    count: number,
    vars?: Record<string, string | number>,
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value: I18nContextValue = {
    locale,
    messages,
    t: (key, vars) => translate(messages, key, vars),
    tp: (key, count, vars) =>
      translatePlural(locale, messages.plural[key], count, vars),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return value;
}
