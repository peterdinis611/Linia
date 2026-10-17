import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "@/features/journey/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("focuses search on / outside an input", () => {
    const onFocusSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onFocusSearch }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }),
    );
    expect(onFocusSearch).toHaveBeenCalledOnce();
  });

  it("swaps on R outside an input", () => {
    const onSwap = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSwap }));

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "r", bubbles: true, cancelable: true }),
    );
    expect(onSwap).toHaveBeenCalledOnce();
  });

  it("ignores / while typing in a field", () => {
    const onFocusSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onFocusSearch }));
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "/",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onFocusSearch).not.toHaveBeenCalled();
    input.remove();
  });
});
