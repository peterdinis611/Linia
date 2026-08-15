"use client";

import { useCallback, useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import { useI18n } from "@/i18n/provider";
import { hallTourSeen, markHallTourSeen } from "../lib/hall-prefs";

type HallTourOptions = {
  onShowMap: () => void;
  onShowBoard: () => void;
};

export function useHallTour({ onShowMap, onShowBoard }: HallTourOptions) {
  const { t } = useI18n();
  const active = useRef<Driver | null>(null);
  const pane = useRef({ onShowMap, onShowBoard });
  const tRef = useRef(t);
  pane.current = { onShowMap, onShowBoard };
  tRef.current = t;

  const stop = useCallback(() => {
    active.current?.destroy();
    active.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    const copy = tRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onFit = () => active.current?.refresh();
    const tour = driver({
      popoverClass: "hall-popover",
      overlayColor: "#161310",
      overlayOpacity: 0.42,
      stagePadding: 10,
      stageRadius: 0,
      popoverOffset: 14,
      animate: !reduced,
      smoothScroll: true,
      disableActiveInteraction: true,
      showProgress: true,
      progressText: copy("guide.progress"),
      nextBtnText: copy("guide.next"),
      prevBtnText: copy("guide.back"),
      doneBtnText: copy("guide.close"),
      onPopoverRender: (popover) => {
        popover.wrapper.setAttribute("data-testid", "hall-tour");
        popover.title.setAttribute("role", "heading");
        popover.title.setAttribute("aria-level", "2");
        popover.closeButton.setAttribute("aria-label", copy("guide.dismiss"));
        if (!popover.wrapper.querySelector(".hall-popover-kicker")) {
          const kicker = document.createElement("p");
          kicker.className = "hall-popover-kicker";
          kicker.textContent = copy("guide.kicker");
          popover.wrapper.insertBefore(kicker, popover.title);
        }
      },
      onDestroyed: () => {
        window.removeEventListener("linia-tour-fit", onFit);
        active.current = null;
        void markHallTourSeen();
      },
      steps: [
        {
          element: "[data-tour='hall']",
          popover: {
            title: copy("guide.title"),
            description: copy("guide.intro"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "[data-tour='origin']",
          disableActiveInteraction: false,
          popover: {
            title: copy("guide.stepOriginTitle"),
            description: copy("guide.stepOriginBody"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "[data-tour='destination']",
          disableActiveInteraction: false,
          popover: {
            title: copy("guide.stepDestTitle"),
            description: copy("guide.stepDestBody"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "[data-tour='route']",
          popover: {
            title: copy("guide.step2Title"),
            description: copy("guide.step2Body"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "[data-tour='when']",
          popover: {
            title: copy("guide.step3Title"),
            description: copy("guide.step3Body"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "[data-tour='line']",
          popover: {
            title: copy("search.line"),
            description: copy("search.lineHint"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "[data-tour='map']",
          waitForElement: 800,
          onHighlightStarted: (_element, _step, { driver: instance }) => {
            pane.current.onShowMap();
            window.setTimeout(() => instance.refresh(), 80);
          },
          popover: {
            title: copy("guide.stepMapTitle"),
            description: copy("guide.stepMapBody"),
            side: "left",
            align: "start",
          },
        },
        {
          element: "[data-tour='board']",
          waitForElement: 400,
          onHighlightStarted: (_element, _step, { driver: instance }) => {
            pane.current.onShowBoard();
            window.setTimeout(() => instance.refresh(), 80);
          },
          popover: {
            title: copy("guide.step4Title"),
            description: copy("guide.step4Body"),
            side: "right",
            align: "start",
          },
        },
      ],
    });
    active.current = tour;
    window.addEventListener("linia-tour-fit", onFit);
    tour.drive();
  }, [stop]);

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
