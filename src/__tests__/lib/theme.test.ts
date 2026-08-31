import { describe, expect, it } from "vitest";
import {
  resolveThemeOnServer,
  themeFromCookieString,
  themeFromCookieValue,
} from "@/lib/theme";

describe("themeFromCookieString", () => {
  it("reads a stamped theme from the cookie jar", () => {
    expect(themeFromCookieString("linia-theme=dark")).toBe("dark");
    expect(themeFromCookieString("other=1; linia-theme=light; x=y")).toBe(
      "light",
    );
  });

  it("falls back to system when the stamp is missing or unknown", () => {
    expect(themeFromCookieString("")).toBe("system");
    expect(themeFromCookieString("linia-theme=sepia")).toBe("system");
  });
});

describe("themeFromCookieValue", () => {
  it("accepts a decoded cookie value", () => {
    expect(themeFromCookieValue("dark")).toBe("dark");
    expect(themeFromCookieValue("light")).toBe("light");
    expect(themeFromCookieValue("system")).toBe("system");
  });

  it("falls back to system when empty or unknown", () => {
    expect(themeFromCookieValue(undefined)).toBe("system");
    expect(themeFromCookieValue("sepia")).toBe("system");
  });
});

describe("resolveThemeOnServer", () => {
  it("honours an explicit stamp before the client hint", () => {
    expect(resolveThemeOnServer("dark", "light")).toBe("dark");
    expect(resolveThemeOnServer("light", "dark")).toBe("light");
  });

  it("uses the color-scheme hint when the stamp is system", () => {
    expect(resolveThemeOnServer("system", "dark")).toBe("dark");
    expect(resolveThemeOnServer("system", "light")).toBe("light");
    expect(resolveThemeOnServer("system", null)).toBe("light");
  });
});
