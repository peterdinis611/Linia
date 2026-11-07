"use client";

import { useSyncExternalStore } from "react";
import {
  getPinnedSearchesSnapshot,
  subscribePinnedSearches,
  type PinnedSearch,
} from "../lib/pinned";
import {
  getRecentSearchesSnapshot,
  subscribeRecentSearches,
  type RecentSearch,
} from "../lib/recent";

const EMPTY_RECENT: RecentSearch[] = [];
const EMPTY_PINNED: PinnedSearch[] = [];

/** Reactive IndexedDB recents — updates on local write and cross-tab. */
export function useRecentSearches() {
  return useSyncExternalStore(
    (onChange) =>
      subscribeRecentSearches(() => {
        onChange();
      }),
    getRecentSearchesSnapshot,
    () => EMPTY_RECENT,
  );
}

/** Reactive IndexedDB pins — updates on local write and cross-tab. */
export function usePinnedSearches() {
  return useSyncExternalStore(
    (onChange) =>
      subscribePinnedSearches(() => {
        onChange();
      }),
    getPinnedSearchesSnapshot,
    () => EMPTY_PINNED,
  );
}
