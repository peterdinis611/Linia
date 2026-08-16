import { describe, expect, it } from "vitest";
import { themeFromCookieString } from "@/lib/theme";

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
