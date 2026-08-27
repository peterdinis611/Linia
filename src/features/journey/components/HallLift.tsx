"use client";

import { useEffect, useState, type RefObject } from "react";
import { IconChevronUp } from "@/components/icons";
import { useI18n } from "@/i18n/provider";

const SHOW_AFTER = 240;

export function HallLift({
  targetRef,
}: {
  targetRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const scroller = targetRef.current;
    if (!scroller) return;
    const node: HTMLElement = scroller;
    function onScroll() {
      setShown(node.scrollTop > SHOW_AFTER);
    }
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [targetRef]);

  function lift() {
    const el = targetRef.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      className="hall-lift"
      data-on={shown}
      data-testid="hall-lift"
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      onClick={lift}
    >
      <IconChevronUp className="hall-lift-mark" />
      {t("results.toTop")}
    </button>
  );
}
