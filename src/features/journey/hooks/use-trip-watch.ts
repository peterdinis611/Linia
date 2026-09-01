"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import type { Itinerary } from "@/lib/transit/types";
import {
  findWatched,
  notificationsReady,
  watchDelta,
  watchFault,
  watchKey,
  type WatchFault,
} from "../lib/trip-watch";

function postNotice(title: string, body: string, tag: string) {
  if (!notificationsReady() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, silent: false });
  } catch {
    // unsupported options or denied after grant
  }
}

export function useTripWatch() {
  const { t } = useI18n();
  const [watchingKey, setWatchingKey] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const snap = useRef<WatchFault | null>(null);

  const inspect = useCallback(
    (list: Itinerary[]) => {
      const prev = snap.current;
      if (!prev) return;
      const found = findWatched(list, prev.key);
      const delta = watchDelta(prev, found);
      if (found) snap.current = watchFault(found);
      if (!delta) return;
      const line = found ? watchFault(found).line : prev.line;
      if (delta === "delay" && found) {
        postNotice(
          t("watch.delayTitle", { line }),
          t("watch.delayBody", { minutes: watchFault(found).delayMinutes ?? 0 }),
          prev.key,
        );
        return;
      }
      if (delta === "cancelled") {
        postNotice(t("watch.cancelledTitle", { line }), t("watch.cancelledBody"), prev.key);
        return;
      }
      postNotice(t("watch.goneTitle", { line }), t("watch.goneBody"), prev.key);
      snap.current = null;
      setWatchingKey(null);
    },
    [t],
  );

  const clear = useCallback(() => {
    snap.current = null;
    setWatchingKey(null);
    setDenied(false);
  }, []);

  async function toggle(itinerary: Itinerary) {
    const key = watchKey(itinerary);
    if (watchingKey === key) {
      snap.current = null;
      setWatchingKey(null);
      setDenied(false);
      return;
    }
    if (!notificationsReady()) {
      setDenied(true);
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      setDenied(true);
      return;
    }
    setDenied(false);
    snap.current = watchFault(itinerary);
    setWatchingKey(key);
  }

  return { watchingKey, denied, supported: notificationsReady(), toggle, inspect, clear };
}
