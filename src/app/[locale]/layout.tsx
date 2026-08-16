import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  isLocale,
  localeNeedsLatinExt,
  localeOg,
  locales,
} from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";
import { hallFontClass } from "@/lib/fonts";
import {
  hallJsonLd,
  languageAlternatePaths,
  localePath,
  serializeJsonLd,
} from "@/lib/seo";
import { siteOrigin } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";
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
  const dict = getDictionary(locale);
  const path = localePath(locale);
  return {
    metadataBase: new URL(siteOrigin()),
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: "Linia",
    keywords: dict.meta.keywords,
    category: "travel",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      siteName: "Linia",
      type: "website",
      locale: localeOg[locale],
      alternateLocale: locales
        .filter((item) => item !== locale)
        .map((item) => localeOg[item]),
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    alternates: {
      canonical: path,
      languages: languageAlternatePaths(),
    },
  };
}

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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${hallFontClass(localeNeedsLatinExt(locale))} h-full overflow-hidden antialiased`}
    >
      <body className="h-full overflow-hidden font-sans text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(hallJsonLd(locale, messages)),
          }}
        />
        <Script
          id="linia-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <I18nProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
