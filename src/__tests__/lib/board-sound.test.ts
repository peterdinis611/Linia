import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();

vi.mock("@/lib/idb", () => ({
  PREFS_STORE: "prefs",
  openLiniaDb: vi.fn(async () => ({
    transaction: () => {
      const tx = {
        objectStore: () => ({
          get: (key: string) => {
            const request = {
              result: store.get(key),
              onsuccess: null as null | (() => void),
              onerror: null as null | (() => void),
            };
            queueMicrotask(() => request.onsuccess?.());
            return request;
          },
          put: (value: unknown, key: string) => {
            store.set(key, value);
          },
        }),
        oncomplete: null as null | (() => void),
        onerror: null as null | (() => void),
        onabort: null as null | (() => void),
      };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    },
  })),
  requestToPromise: async <T>(request: {
    result: T;
    onsuccess: null | (() => void);
  }) =>
    new Promise<T>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    }),
  txDone: async (tx: { oncomplete: null | (() => void) }) =>
    new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    }),
  publishHall: vi.fn(),
}));

describe("board-sound persistence", () => {
  beforeEach(() => {
    store.clear();
    localStorage.clear();
    vi.stubGlobal("indexedDB", {});
    vi.resetModules();
  });

  it("defaults to on and persists toggles in IndexedDB", async () => {
    const sound = await import("@/lib/board-sound");
    expect(sound.isSoundEnabled()).toBe(true);
    expect(sound.toggleSound()).toBe(false);
    await vi.waitFor(() => {
      expect(store.get("board-sound")).toBe(false);
    });
    await sound.hydrateSoundPref();
    expect(sound.isSoundEnabled()).toBe(false);
  });

  it("migrates a legacy localStorage flag into IndexedDB once", async () => {
    localStorage.setItem("linia_board_sound_enabled", "false");
    const sound = await import("@/lib/board-sound");
    await sound.hydrateSoundPref();
    expect(sound.isSoundEnabled()).toBe(false);
    expect(localStorage.getItem("linia_board_sound_enabled")).toBeNull();
    expect(store.get("board-sound")).toBe(false);
  });
});
