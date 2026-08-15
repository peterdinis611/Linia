const DB_NAME = "linia";
const DB_VERSION = 2;
const CHANNEL = "linia-hall";

export const RECENT_STORE = "recent";
export const PREFS_STORE = "prefs";

export type HallTopic = "recent" | "prefs";

let dbPromise: Promise<IDBDatabase> | null = null;
let channel: BroadcastChannel | null = null;
let persistAsked = false;

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

export function publishHall(topic: HallTopic) {
  hallChannel()?.postMessage({ topic });
}

export function subscribeHall(topic: HallTopic, onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const ch = hallChannel();
  const onMessage = (event: MessageEvent<{ topic?: HallTopic }>) => {
    if (event.data?.topic === topic) onChange();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };
  ch?.addEventListener("message", onMessage);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    ch?.removeEventListener("message", onMessage);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onChange);
    window.removeEventListener("focus", onChange);
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
