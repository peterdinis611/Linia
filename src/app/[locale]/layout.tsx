import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Fraunces, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import Script from "next/script";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isLocale, localeOg, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";
import {
  hallJsonLd,
  languageAlternatePaths,
  localePath,
  serializeJsonLd,
} from "@/lib/seo";
import { siteOrigin } from "@/lib/site";
import { isTheme, themeCookie, themeInitScript } from "@/lib/theme";
import "../globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
});

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
  const themeValue = (await cookies()).get(themeCookie)?.value;
  const initialTheme = isTheme(themeValue) ? themeValue : "system";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fraunces.variable} ${schibsted.variable} ${plexMono.variable} h-full overflow-hidden antialiased${initialTheme === "dark" ? " dark" : ""}`}
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
          <ThemeProvider initialTheme={initialTheme}>
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
