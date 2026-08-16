"use client";

import "driver.js/dist/driver.css";
import { driver, type Driver } from "driver.js";
import { markHallTourSeen } from "./hall-prefs";

export type HallTourHandle = Pick<Driver, "destroy" | "refresh" | "drive">;

export function createHallTour(input: {
  copy: (key: string) => string;
  onShowMap: () => void;
  onShowBoard: () => void;
}): HallTourHandle {
  const { copy, onShowMap, onShowBoard } = input;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active: Driver | null = null;
  const onFit = () => active?.refresh();

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
      active = null;
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
          onShowMap();
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
          onShowBoard();
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

  active = tour;
  window.addEventListener("linia-tour-fit", onFit);
  return tour;
}
