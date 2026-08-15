"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Popover } from "radix-ui";
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

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    persistLocale(next);
    router.push(`${withLocale(pathname, next)}${search}`);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="lang-switch"
          aria-label={t("language.label")}
          title={localeNames[locale]}
          data-testid="language-switcher"
          data-locale={locale}
        >
          <span className="lang-switch-flag" aria-hidden="true">
            {localeFlags[locale]}
          </span>
          <span className="lang-switch-code">{locale}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="lang-sheet"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          data-testid="lang-sheet"
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
