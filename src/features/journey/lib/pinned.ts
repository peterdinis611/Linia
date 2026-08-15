import { selectedPlaceSchema, type SelectedPlace } from "@/lib/schemas";
import {
  openLiniaDb,
  PINNED_STORE,
  publishHall,
  requestPersistentHall,
  requestToPromise,
  subscribeHall,
  txDone,
} from "@/lib/idb";

export const MAX_PINNED = 3;

export type PinnedRole = "home" | "work" | "line";

export type PinnedSearch = {
  role: PinnedRole;
  from: SelectedPlace;
  to: SelectedPlace;
  via: SelectedPlace[];
  savedAt: number;
};

type StoredPinned = PinnedSearch & { id: string };

function samePlace(a: SelectedPlace, b: SelectedPlace) {
  return a.id === b.id || (a.lat === b.lat && a.lon === b.lon);
}

function sameRoute(
  a: Pick<PinnedSearch, "from" | "to" | "via">,
  b: Pick<PinnedSearch, "from" | "to" | "via">,
) {
  if (!samePlace(a.from, b.from) || !samePlace(a.to, b.to)) return false;
  if (a.via.length !== b.via.length) return false;
  return a.via.every((stop, index) => samePlace(stop, b.via[index]!));
}

function pinId(entry: PinnedSearch) {
  return entry.role;
}

export function pinnedOnRoute(
  pins: PinnedSearch[],
  route: Pick<PinnedSearch, "from" | "to" | "via">,
) {
  return pins.find((item) => sameRoute(item, route)) ?? null;
}

export function mergePinned(
  entry: Omit<PinnedSearch, "savedAt"> & { savedAt?: number },
  current: PinnedSearch[],
): PinnedSearch[] {
  const next: PinnedSearch = {
    ...entry,
    savedAt: entry.savedAt ?? Date.now(),
  };
  const rest = current.filter(
    (item) => item.role !== next.role && !sameRoute(item, next),
  );
  return [next, ...rest].slice(0, MAX_PINNED);
}

export function dropPinned(
  current: PinnedSearch[],
  role: PinnedRole,
): PinnedSearch[] {
  return current.filter((item) => item.role !== role);
}

function parseStored(item: unknown): PinnedSearch | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const from = selectedPlaceSchema.safeParse(record.from);
  const to = selectedPlaceSchema.safeParse(record.to);
  if (!from.success || !to.success) return null;
  const role = record.role;
  if (role !== "home" && role !== "work" && role !== "line") return null;
  const via = Array.isArray(record.via)
    ? record.via.flatMap((stop: unknown) => {
        const parsedStop = selectedPlaceSchema.safeParse(stop);
        return parsedStop.success ? [parsedStop.data] : [];
      })
    : [];
  return {
    role,
    from: from.data,
    to: to.data,
    via,
    savedAt: typeof record.savedAt === "number" ? record.savedAt : 0,
  };
}

async function readAll(db: IDBDatabase): Promise<PinnedSearch[]> {
  const tx = db.transaction(PINNED_STORE, "readonly");
  const rows = await requestToPromise(tx.objectStore(PINNED_STORE).getAll());
  return (Array.isArray(rows) ? rows : [])
    .flatMap((row) => {
      const parsed = parseStored(row);
      return parsed ? [parsed] : [];
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

async function writeAll(db: IDBDatabase, items: PinnedSearch[]): Promise<void> {
  const tx = db.transaction(PINNED_STORE, "readwrite");
  const done = txDone(tx);
  const store = tx.objectStore(PINNED_STORE);
  store.clear();
  for (const item of items) {
    const row: StoredPinned = { id: pinId(item), ...item };
    store.put(row);
  }
  await done;
}

export async function readPinnedSearches(): Promise<PinnedSearch[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    return await readAll(await openLiniaDb());
  } catch {
    return [];
  }
}

export async function pinSearch(
  entry: Omit<PinnedSearch, "savedAt">,
): Promise<PinnedSearch[]> {
  const next = mergePinned(entry, await readPinnedSearches());
  if (typeof indexedDB === "undefined") return next;
  try {
    await requestPersistentHall();
    await writeAll(await openLiniaDb(), next);
    publishHall("pinned");
  } catch {
    // private mode / blocked storage
  }
  return next;
}

export async function unpinSearch(role: PinnedRole): Promise<PinnedSearch[]> {
  const next = dropPinned(await readPinnedSearches(), role);
  if (typeof indexedDB === "undefined") return next;
  try {
    await writeAll(await openLiniaDb(), next);
    publishHall("pinned");
  } catch {
    // private mode / blocked storage
  }
  return next;
}

export function subscribePinnedSearches(
  onChange: (items: PinnedSearch[]) => void,
) {
  return subscribeHall("pinned", () => {
    void readPinnedSearches().then(onChange);
  });
}
