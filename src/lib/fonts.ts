import { Fraunces, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";

const frauncesLatin = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "600"],
});

const frauncesExt = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  style: ["italic"],
  weight: ["400", "600"],
});

const schibstedLatin = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const schibstedExt = Schibsted_Grotesk({
  variable: "--font-schibsted",
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
    ? [frauncesExt, schibstedExt, plexExt]
    : [frauncesLatin, schibstedLatin, plexLatin];
  return pack.map((font) => font.variable).join(" ");
}
