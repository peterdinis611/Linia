import localFont from "next/font/local";

/**
 * Self-hosted hall fonts (woff2 in src/fonts).
 * Avoids next/font/google downloads that break offline / CI builds.
 */

const displayLatin = localFont({
  variable: "--font-display-face",
  display: "swap",
  src: [
    {
      path: "../fonts/barlow-condensed-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/barlow-condensed-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/barlow-condensed-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

const displayExt = localFont({
  variable: "--font-display-face",
  display: "swap",
  src: [
    {
      path: "../fonts/barlow-condensed-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/barlow-condensed-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/barlow-condensed-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/barlow-condensed-latin-ext-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/barlow-condensed-latin-ext-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/barlow-condensed-latin-ext-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

const sansLatin = localFont({
  variable: "--font-sans-face",
  display: "swap",
  preload: false,
  src: [
    {
      path: "../fonts/ibm-plex-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
});

const sansExt = localFont({
  variable: "--font-sans-face",
  display: "swap",
  preload: false,
  src: [
    {
      path: "../fonts/ibm-plex-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-latin-ext-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-latin-ext-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-latin-ext-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-cyrillic-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-cyrillic-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-cyrillic-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
});

const plexLatin = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  src: [
    {
      path: "../fonts/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
});

const plexExt = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  src: [
    {
      path: "../fonts/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono-latin-ext-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono-latin-ext-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono-cyrillic-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono-cyrillic-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
});

export function hallFontClass(latinExt: boolean) {
  const pack = latinExt
    ? [displayExt, sansExt, plexExt]
    : [displayLatin, sansLatin, plexLatin];
  return pack.map((font) => font.variable).join(" ");
}
