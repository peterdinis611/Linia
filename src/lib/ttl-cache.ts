type Entry<T> = { at: number; value: T };

export function createTtlCache<T>(options: { ttlMs: number; max?: number }) {
  const store = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();
  const max = options.max ?? 64;

  function peek(key: string): T | undefined {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at >= options.ttlMs) {
      store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  function set(key: string, value: T) {
    if (store.has(key)) store.delete(key);
    store.set(key, { at: Date.now(), value });
    while (store.size > max) {
      const oldest = store.keys().next().value;
      if (!oldest) break;
      store.delete(oldest);
    }
  }

  async function get(
    key: string,
    load: () => Promise<T>,
    options?: { fresh?: boolean },
  ): Promise<T> {
    if (!options?.fresh) {
      const hit = peek(key);
      if (hit !== undefined) return hit;
      const pending = inflight.get(key);
      if (pending) return pending;
    }

    const pending = load()
      .then((value) => {
        set(key, value);
        return value;
      })
      .finally(() => {
        if (inflight.get(key) === pending) inflight.delete(key);
      });
    inflight.set(key, pending);
    return pending;
  }

  return { get, peek, set };
}
