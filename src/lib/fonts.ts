import {
  Barlow_Condensed,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";

const displayLatin = Barlow_Condensed({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const displayExt = Barlow_Condensed({
  variable: "--font-display-face",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const sansLatin = IBM_Plex_Sans({
  variable: "--font-sans-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const sansExt = IBM_Plex_Sans({
  variable: "--font-sans-face",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  preload: false,
});

const plexLatin = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  preload: false,
});

const plexExt = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  preload: false,
});

export function hallFontClass(latinExt: boolean) {
  const pack = latinExt
    ? [displayExt, sansExt, plexExt]
    : [displayLatin, sansLatin, plexLatin];
  return pack.map((font) => font.variable).join(" ");
}
