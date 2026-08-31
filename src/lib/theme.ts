export const themeCookie = "linia-theme";
export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];
export type ResolvedTheme = "light" | "dark";

export function isTheme(value: string | undefined | null): value is Theme {
  return value != null && (themes as readonly string[]).includes(value);
}

export function themeFromCookieValue(value: string | undefined | null): Theme {
  if (value == null || value === "") return "system";
  try {
    const next = decodeURIComponent(value);
    return isTheme(next) ? next : "system";
  } catch {
    return "system";
  }
}

export function themeFromCookieString(cookie: string): Theme {
  const match = cookie.match(new RegExp(`(?:^|; )${themeCookie}=([^;]*)`));
  return themeFromCookieValue(match?.[1]);
}

export function resolveThemeOnServer(
  theme: Theme,
  prefersColorScheme?: string | null,
): ResolvedTheme {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return prefersColorScheme === "dark" ? "dark" : "light";
}
