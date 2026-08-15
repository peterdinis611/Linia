import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { Locale } from "@/i18n/config";
import { en, type Messages } from "@/i18n/messages/en";
import { I18nProvider } from "@/i18n/provider";

type HallOptions = Omit<RenderOptions, "wrapper"> & {
  locale?: Locale;
  messages?: Messages;
};

function HallProviders({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <ThemeProvider initialTheme="light">{children}</ThemeProvider>
    </I18nProvider>
  );
}

export function renderHall(ui: ReactElement, options: HallOptions = {}) {
  const { locale = "en", messages = en, ...rest } = options;
  return render(ui, {
    ...rest,
    wrapper: ({ children }) => (
      <HallProviders locale={locale} messages={messages}>
        {children}
      </HallProviders>
    ),
  });
}
