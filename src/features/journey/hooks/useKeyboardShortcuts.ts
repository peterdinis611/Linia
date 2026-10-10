"use client";

import { useEffect } from "react";

type KeyboardShortcutsOptions = {
  /** Ref or selector for the "from" (origin) input to focus when "/" is pressed */
  onFocusSearch?: () => void;
  /** Called when user presses "R" (outside an input) to swap origin/destination */
  onSwap?: () => void;
  /** Called when user presses Escape */
  onEscape?: () => void;
  /** Set to false to disable all shortcuts (e.g. while a modal is open) */
  enabled?: boolean;
};

/**
 * Registers global keyboard shortcuts for the hall:
 *
 *  /        – focus the origin search input
 *  R        – swap origin and destination (when not typing in an input)
 *  Escape   – blur active element / trigger onEscape
 *
 * Shortcuts are suppressed when the user is typing inside an <input>,
 * <textarea>, or a contentEditable element.
 */
export function useKeyboardShortcuts({
  onFocusSearch,
  onSwap,
  onEscape,
  enabled = true,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function isTyping(event: KeyboardEvent): boolean {
      const target = event.target as HTMLElement | null;
      if (!target) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Never fire on modified keys (Ctrl/Meta/Alt combos other than plain Alt)
      if (event.ctrlKey || event.metaKey) return;

      switch (event.key) {
        case "/": {
          // Only intercept if not already in an input
          if (!isTyping(event)) {
            event.preventDefault();
            onFocusSearch?.();
          }
          break;
        }

        case "r":
        case "R": {
          if (!isTyping(event)) {
            event.preventDefault();
            onSwap?.();
          }
          break;
        }

        case "Escape": {
          // Always fire Escape — components handle their own state
          onEscape?.();
          (document.activeElement as HTMLElement | null)?.blur();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onFocusSearch, onSwap, onEscape]);
}
