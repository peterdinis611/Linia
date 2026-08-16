"use client";

import { useCallback, useEffect, useRef } from "react";
import { useI18n } from "@/i18n/provider";
import { hallTourSeen } from "../lib/hall-prefs";
import type { HallTourHandle } from "../lib/start-hall-tour";

type HallTourOptions = {
  onShowMap: () => void;
  onShowBoard: () => void;
};

export function useHallTour({ onShowMap, onShowBoard }: HallTourOptions) {
  const { t } = useI18n();
  const active = useRef<HallTourHandle | null>(null);
  const pane = useRef({ onShowMap, onShowBoard });
  const tRef = useRef(t);
  const gen = useRef(0);
  pane.current = { onShowMap, onShowBoard };
  tRef.current = t;

  const stop = useCallback(() => {
    gen.current += 1;
    active.current?.destroy();
    active.current = null;
  }, []);

  const start = useCallback(() => {
    const id = ++gen.current;
    active.current?.destroy();
    active.current = null;
    void import("../lib/start-hall-tour").then(({ createHallTour }) => {
      if (id !== gen.current) return;
      const tour = createHallTour({
        copy: tRef.current,
        onShowMap: () => pane.current.onShowMap(),
        onShowBoard: () => pane.current.onShowBoard(),
      });
      active.current = tour;
      tour.drive();
    });
  }, []);

  useEffect(() => {
    if (navigator.webdriver) return;
    if (window.location.search) return;
    let cancelled = false;
    let timer = 0;
    void hallTourSeen().then((seen) => {
      if (cancelled || seen) return;
      timer = window.setTimeout(() => {
        if (!cancelled) start();
      }, 700);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stop();
    };
  }, [start, stop]);

  return start;
}
