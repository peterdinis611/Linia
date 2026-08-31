import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { isLocale, localeNeedsLatinExt, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";
import { hallFontClass } from "@/lib/fonts";
import {
  hallJsonLd,
  hallMetadata,
  serializeJsonLd,
  sitemapHref,
} from "@/lib/seo";
import {
  resolveThemeOnServer,
  themeCookie,
  themeFromCookieValue,
} from "@/lib/theme";
import "../globals.css";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return hallMetadata(locale, getDictionary(locale));
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1eadc" },
    { media: "(prefers-color-scheme: dark)", color: "#10161f" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getDictionary(locale);
  const cookieStore = await cookies();
  const theme = themeFromCookieValue(cookieStore.get(themeCookie)?.value);
  const resolved = resolveThemeOnServer(
    theme,
    (await headers()).get("sec-ch-prefers-color-scheme"),
  );

  return (
    <html
      lang={locale}
      dir="ltr"
      suppressHydrationWarning
      className={`${hallFontClass(localeNeedsLatinExt(locale))} h-full overflow-hidden antialiased${resolved === "dark" ? " dark" : ""}`}
      style={{ colorScheme: resolved }}
    >
      <head>
        <link rel="sitemap" type="application/xml" title="Sitemap" href={sitemapHref()} />
        <link rel="preconnect" href="https://server.arcgisonline.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(hallJsonLd(locale, messages)),
          }}
        />
      </head>
      <body className="h-full overflow-hidden font-sans text-ink">
        <I18nProvider locale={locale} messages={messages}>
          <ThemeProvider initialTheme={theme} initialResolved={resolved}>
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
