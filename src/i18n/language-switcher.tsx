"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FloatSheet } from "@/components/FloatSheet";
import {
  localeCookie,
  localeFlags,
  localeNames,
  locales,
  type Locale,
} from "./config";
import { useI18n } from "./provider";

function withLocale(pathname: string, locale: Locale) {
  const segments = pathname.split("/");
  if (segments.length > 1) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }
  return `/${locale}`;
}

function persistLocale(locale: Locale) {
  document.cookie = `${localeCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageSwitcher({ search = "" }: { search?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname() || `/${locale}`;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    persistLocale(next);
    const href = `${withLocale(pathname, next)}${search}`;
    router.push(href as Parameters<typeof router.push>[0]);
  }

  return (
    <div className="lang-picker">
      <button
        ref={buttonRef}
        type="button"
        className="lang-switch"
        aria-label={t("language.label")}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={localeNames[locale]}
        data-testid="language-switcher"
        data-locale={locale}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="lang-switch-flag" aria-hidden="true">
          {localeFlags[locale]}
        </span>
        <span className="lang-switch-code">{locale}</span>
      </button>
      {open ? (
        <FloatSheet
          anchorRef={buttonRef}
          align="end"
          className="lang-sheet"
          testId="lang-sheet"
          label={t("language.label")}
          onDismiss={close}
        >
          <p className="kicker">{t("language.label")}</p>
          <div role="listbox" aria-label={t("language.label")}>
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                lang={item}
                data-on={item === locale}
                aria-selected={item === locale}
                data-testid={`lang-option-${item}`}
                className="lang-sheet-item"
                onClick={() => choose(item)}
              >
                <span className="lang-switch-flag" aria-hidden="true">
                  {localeFlags[item]}
                </span>
                <span className="lang-oval">{item}</span>
                <span className="lang-sheet-name">{localeNames[item]}</span>
              </button>
            ))}
          </div>
        </FloatSheet>
      ) : null}
    </div>
  );
}
