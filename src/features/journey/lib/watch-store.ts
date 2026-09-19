import {
  openLiniaDb,
  PREFS_STORE,
  publishHall,
  requestToPromise,
  txDone,
} from "@/lib/idb";
import type { WatchFault } from "./trip-watch";

const WATCH_KEY = "trip-watch";

export type StoredWatch = {
  key: string;
  fault: WatchFault;
  until: number;
};

export function watchUntilMorning(now = Date.now()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

export function watchStillHolds(until: number, now = Date.now()) {
  return until > now;
}

function asStoredWatch(value: unknown): StoredWatch | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<StoredWatch>;
  if (typeof record.key !== "string" || !record.key) return null;
  if (typeof record.until !== "number" || !Number.isFinite(record.until)) {
    return null;
  }
  const fault = record.fault;
  if (!fault || typeof fault !== "object") return null;
  if (typeof fault.key !== "string" || typeof fault.line !== "string") {
    return null;
  }
  if (typeof fault.cancelled !== "boolean") return null;
  if (fault.delayMinutes != null && typeof fault.delayMinutes !== "number") {
    return null;
  }
  return {
    key: record.key,
    until: record.until,
    fault: {
      key: fault.key,
      cancelled: fault.cancelled,
      delayMinutes: fault.delayMinutes ?? null,
      line: fault.line,
    },
  };
}

export async function loadWatch(): Promise<StoredWatch | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openLiniaDb();
    const tx = db.transaction(PREFS_STORE, "readonly");
    const value = await requestToPromise(tx.objectStore(PREFS_STORE).get(WATCH_KEY));
    const stored = asStoredWatch(value);
    if (!stored) return null;
    if (!watchStillHolds(stored.until)) {
      await saveWatch(null);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export async function saveWatch(value: StoredWatch | null): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openLiniaDb();
    const tx = db.transaction(PREFS_STORE, "readwrite");
    const done = txDone(tx);
    const store = tx.objectStore(PREFS_STORE);
    if (value) store.put(value, WATCH_KEY);
    else store.delete(WATCH_KEY);
    await done;
    publishHall("prefs");
  } catch {
    // private mode / blocked storage
  }
}
