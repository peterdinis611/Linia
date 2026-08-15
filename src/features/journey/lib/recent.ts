import { selectedPlaceSchema, type SelectedPlace } from "@/lib/schemas";
import {
  openLiniaDb,
  publishHall,
  RECENT_STORE,
  requestPersistentHall,
  requestToPromise,
  subscribeHall,
  txDone,
} from "@/lib/idb";

const MAX_RECENT = 6;

export type RecentSearch = {
  from: SelectedPlace;
  to: SelectedPlace;
  via: SelectedPlace[];
  savedAt: number;
};

type StoredRecent = RecentSearch & { id: string };

function samePlace(a: SelectedPlace, b: SelectedPlace) {
  return a.id === b.id || (a.lat === b.lat && a.lon === b.lon);
}

function sameRoute(a: RecentSearch, b: Pick<RecentSearch, "from" | "to" | "via">) {
  if (!samePlace(a.from, b.from) || !samePlace(a.to, b.to)) return false;
  if (a.via.length !== b.via.length) return false;
  return a.via.every((stop, index) => samePlace(stop, b.via[index]!));
}

function routeId(entry: Pick<RecentSearch, "from" | "to" | "via">) {
  return [entry.from.id, entry.to.id, ...entry.via.map((stop) => stop.id)].join("|");
}

export function mergeRecent(
  entry: Pick<RecentSearch, "from" | "to" | "via">,
  current: RecentSearch[],
  savedAt = Date.now(),
): RecentSearch[] {
  return [
    { ...entry, savedAt },
    ...current.filter((item) => !sameRoute(item, entry)),
  ].slice(0, MAX_RECENT);
}

function parseStored(item: unknown): RecentSearch | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const from = selectedPlaceSchema.safeParse(record.from);
  const to = selectedPlaceSchema.safeParse(record.to);
  if (!from.success || !to.success) return null;
  const via = Array.isArray(record.via)
    ? record.via.flatMap((stop: unknown) => {
        const parsedStop = selectedPlaceSchema.safeParse(stop);
        return parsedStop.success ? [parsedStop.data] : [];
      })
    : [];
  return {
    from: from.data,
    to: to.data,
    via,
    savedAt: typeof record.savedAt === "number" ? record.savedAt : 0,
  };
}

async function readAll(db: IDBDatabase): Promise<RecentSearch[]> {
  const tx = db.transaction(RECENT_STORE, "readonly");
  const rows = await requestToPromise(tx.objectStore(RECENT_STORE).getAll());
  return (Array.isArray(rows) ? rows : [])
    .flatMap((row) => {
      const parsed = parseStored(row);
      return parsed ? [parsed] : [];
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

async function writeAll(db: IDBDatabase, items: RecentSearch[]): Promise<void> {
  const tx = db.transaction(RECENT_STORE, "readwrite");
  const done = txDone(tx);
  const store = tx.objectStore(RECENT_STORE);
  store.clear();
  for (const item of items) {
    const row: StoredRecent = { id: routeId(item), ...item };
    store.put(row);
  }
  await done;
}

export async function readRecentSearches(): Promise<RecentSearch[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    return await readAll(await openLiniaDb());
  } catch {
    return [];
  }
}

export async function rememberSearch(
  entry: Pick<RecentSearch, "from" | "to" | "via">,
): Promise<RecentSearch[]> {
  const next = mergeRecent(entry, await readRecentSearches());
  if (typeof indexedDB === "undefined") return next;
  try {
    await requestPersistentHall();
    await writeAll(await openLiniaDb(), next);
    publishHall("recent");
  } catch {
    // private mode / blocked storage
  }
  return next;
}

export function subscribeRecentSearches(
  onChange: (items: RecentSearch[]) => void,
) {
  return subscribeHall("recent", () => {
    void readRecentSearches().then(onChange);
  });
}
