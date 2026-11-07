const DB_NAME = "linia";
const DB_VERSION = 3;
const CHANNEL = "linia-hall";

export const RECENT_STORE = "recent";
export const PREFS_STORE = "prefs";
export const PINNED_STORE = "pinned";

export type HallTopic = "recent" | "prefs" | "pinned";

let dbPromise: Promise<IDBDatabase> | null = null;
let channel: BroadcastChannel | null = null;
let persistAsked = false;

/** Bumps on every local publish — same-tab BroadcastChannel echoes are ignored. */
let publishEpoch = 0;

/** Same-tab reactive bus (BroadcastChannel alone is not enough for reactivity). */
const localBus = new EventTarget();

function hallChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

export function openLiniaDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("idb"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RECENT_STORE)) {
          db.createObjectStore(RECENT_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(PREFS_STORE)) {
          db.createObjectStore(PREFS_STORE);
        }
        if (!db.objectStoreNames.contains(PINNED_STORE)) {
          db.createObjectStore(PINNED_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          dbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("idb"));
      };
    });
  }
  return dbPromise;
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb"));
  });
}

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb"));
    tx.onabort = () => reject(tx.error ?? new Error("idb"));
  });
}

/**
 * Notify hall listeners. Same-tab gets the EventTarget immediately;
 * other tabs get BroadcastChannel. Own-tab channel echo is skipped via epoch.
 */
export function publishHall(topic: HallTopic) {
  publishEpoch += 1;
  const epoch = publishEpoch;
  localBus.dispatchEvent(
    new CustomEvent("hall", { detail: { topic, epoch } }),
  );
  try {
    hallChannel()?.postMessage({ topic, epoch });
  } catch {
    // channel closed / unsupported
  }
}

/**
 * Subscribe to hall topic changes.
 * - Local writes → immediate (EventTarget)
 * - Other tabs → BroadcastChannel
 * - Return from background → one revalidate (missed cross-tab / external edits)
 * No focus/pageshow spam.
 */
export function subscribeHall(topic: HallTopic, onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onLocal = (event: Event) => {
    const detail = (event as CustomEvent<{ topic?: HallTopic }>).detail;
    if (detail?.topic === topic) onChange();
  };

  const onMessage = (
    event: MessageEvent<{ topic?: HallTopic; epoch?: number }>,
  ) => {
    if (event.data?.topic !== topic) return;
    if (event.data.epoch === publishEpoch) return;
    onChange();
  };

  let hidden = document.visibilityState === "hidden";
  const onVisible = () => {
    if (document.visibilityState === "hidden") {
      hidden = true;
      return;
    }
    if (!hidden) return;
    hidden = false;
    onChange();
  };

  localBus.addEventListener("hall", onLocal);
  const ch = hallChannel();
  ch?.addEventListener("message", onMessage);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    localBus.removeEventListener("hall", onLocal);
    ch?.removeEventListener("message", onMessage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/**
 * In-memory snapshot store wired to a hall topic — sync reads for React,
 * async hydrate + cross-tab reload.
 */
export function createHallSnapshotStore<T>(options: {
  topic: HallTopic;
  empty: T;
  read: () => Promise<T>;
  same?: (a: T, b: T) => boolean;
}) {
  let snapshot = options.empty;
  let version = 0;
  let hydrate: Promise<T> | null = null;
  const listeners = new Set<() => void>();

  function emit() {
    version += 1;
    for (const listener of listeners) listener();
  }

  function setSnapshot(next: T, notifyHall = false) {
    if (options.same?.(snapshot, next)) {
      if (notifyHall) publishHall(options.topic);
      return snapshot;
    }
    snapshot = next;
    emit();
    if (notifyHall) publishHall(options.topic);
    return snapshot;
  }

  async function refresh() {
    const next = await options.read();
    return setSnapshot(next, false);
  }

  function ensureHydrated() {
    if (!hydrate) {
      hydrate = refresh();
    }
    return hydrate;
  }

  let hallStop: (() => void) | null = null;

  function subscribe(onStoreChange: () => void) {
    listeners.add(onStoreChange);
    if (!hallStop) {
      void ensureHydrated();
      hallStop = subscribeHall(options.topic, () => {
        void refresh();
      });
    }
    return () => {
      listeners.delete(onStoreChange);
      if (listeners.size === 0 && hallStop) {
        hallStop();
        hallStop = null;
        hydrate = null;
      }
    };
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => options.empty,
    getVersion: () => version,
    subscribe,
    /** Optimistic / post-write update — notifies React, then hall for other tabs. */
    commit: (next: T) => setSnapshot(next, true),
    /** Replace cache without publishing (e.g. after local read). */
    replace: (next: T) => setSnapshot(next, false),
    refresh,
    ensureHydrated,
  };
}

export async function requestPersistentHall() {
  if (persistAsked || typeof navigator === "undefined") return;
  persistAsked = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // private mode / unsupported
  }
}
