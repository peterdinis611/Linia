"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playFlap } from "@/lib/board-sound";
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
import {
  loadWatch,
  saveWatch,
  watchUntilMorning,
} from "../lib/watch-store";

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

  useEffect(() => {
    let cancelled = false;
    void loadWatch().then((stored) => {
      if (cancelled || !stored) return;
      snap.current = stored.fault;
      setWatchingKey(stored.key);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        playFlap(3);
        postNotice(
          t("watch.delayTitle", { line }),
          t("watch.delayBody", { minutes: watchFault(found).delayMinutes ?? 0 }),
          prev.key,
        );
        void saveWatch({
          key: prev.key,
          fault: watchFault(found),
          until: watchUntilMorning(),
        });
        return;
      }
      if (delta === "cancelled") {
        playFlap(2);
        postNotice(t("watch.cancelledTitle", { line }), t("watch.cancelledBody"), prev.key);
        if (found) {
          void saveWatch({
            key: prev.key,
            fault: watchFault(found),
            until: watchUntilMorning(),
          });
        }
        return;
      }
      postNotice(t("watch.goneTitle", { line }), t("watch.goneBody"), prev.key);
      snap.current = null;
      setWatchingKey(null);
      void saveWatch(null);
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
      await saveWatch(null);
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
    const fault = watchFault(itinerary);
    snap.current = fault;
    setWatchingKey(key);
    await saveWatch({
      key,
      fault,
      until: watchUntilMorning(),
    });
  }

  return { watchingKey, denied, supported: notificationsReady(), toggle, inspect, clear };
}
