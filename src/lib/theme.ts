export const themeCookie = "linia-theme";
export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];
export type ResolvedTheme = "light" | "dark";

export function isTheme(value: string | undefined | null): value is Theme {
  return value != null && (themes as readonly string[]).includes(value);
}

export function themeFromCookieString(cookie: string): Theme {
  const match = cookie.match(new RegExp(`(?:^|; )${themeCookie}=([^;]*)`));
  if (!match?.[1]) return "system";
  try {
    const value = decodeURIComponent(match[1]);
    return isTheme(value) ? value : "system";
  } catch {
    return "system";
  }
}

export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${themeCookie}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
