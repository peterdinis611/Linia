import {
  openLiniaDb,
  PREFS_STORE,
  publishHall,
  requestToPromise,
  subscribeHall,
  txDone,
} from "@/lib/idb";

const TOUR_KEY = "tour-seen";
const HOWTO_KEY = "howto-seen";

async function prefSeen(key: string, fallbackWhenBlocked: boolean): Promise<boolean> {
  if (typeof indexedDB === "undefined") return fallbackWhenBlocked;
  try {
    const db = await openLiniaDb();
    const tx = db.transaction(PREFS_STORE, "readonly");
    const value = await requestToPromise(tx.objectStore(PREFS_STORE).get(key));
    return value === true;
  } catch {
    return fallbackWhenBlocked;
  }
}

async function markPref(key: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openLiniaDb();
    const tx = db.transaction(PREFS_STORE, "readwrite");
    const done = txDone(tx);
    tx.objectStore(PREFS_STORE).put(true, key);
    await done;
    publishHall("prefs");
  } catch {
    // private mode / blocked storage
  }
}

export async function hallTourSeen(): Promise<boolean> {
  return prefSeen(TOUR_KEY, false);
}

export async function markHallTourSeen(): Promise<void> {
  await markPref(TOUR_KEY);
}

/** Inline 4-step howto under the empty board — hide after first search or dismiss. */
export async function hallHowtoSeen(): Promise<boolean> {
  return prefSeen(HOWTO_KEY, false);
}

export async function markHallHowtoSeen(): Promise<void> {
  await markPref(HOWTO_KEY);
}

export function subscribeHallPrefs(onChange: () => void) {
  return subscribeHall("prefs", onChange);
}
