import {
  openLiniaDb,
  PREFS_STORE,
  publishHall,
  requestToPromise,
  subscribeHall,
  txDone,
} from "@/lib/idb";

const TOUR_KEY = "tour-seen";

export async function hallTourSeen(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return true;
  try {
    const db = await openLiniaDb();
    const tx = db.transaction(PREFS_STORE, "readonly");
    const value = await requestToPromise(tx.objectStore(PREFS_STORE).get(TOUR_KEY));
    return value === true;
  } catch {
    return false;
  }
}

export async function markHallTourSeen(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openLiniaDb();
    const tx = db.transaction(PREFS_STORE, "readwrite");
    const done = txDone(tx);
    tx.objectStore(PREFS_STORE).put(true, TOUR_KEY);
    await done;
    publishHall("prefs");
  } catch {
    // private mode / blocked storage
  }
}

export function subscribeHallPrefs(onChange: () => void) {
  return subscribeHall("prefs", onChange);
}
