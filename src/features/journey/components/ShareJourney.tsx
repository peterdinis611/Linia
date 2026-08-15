"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import type { Itinerary } from "@/lib/transit/types";
import { downloadIcs, icsFilename, itineraryIcs } from "../lib/ics";

type ShareJourneyProps = {
  url: string;
  itinerary: Itinerary | null;
  fromName?: string;
  toName?: string;
};

export function ShareJourney({
  url,
  itinerary,
  fromName,
  toName,
}: ShareJourneyProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onClick(event: MouseEvent) {
      if (event.target === dialogRef.current) dialogRef.current?.close();
    }
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const origin = fromName ?? itinerary?.legs[0]?.from.name;
  const destination =
    toName ?? itinerary?.legs[itinerary.legs.length - 1]?.to.name;
  const shareTitle =
    origin && destination ? `${origin} → ${destination}` : "Linia";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const field = dialogRef.current?.querySelector("input");
      field?.select();
      const ok = document.execCommand("copy");
      if (ok) setCopied(true);
    }
  }

  function printTicket() {
    dialogRef.current?.close();
    window.setTimeout(() => window.print(), 50);
  }

  function addToCalendar() {
    if (!itinerary) return;
    downloadIcs(
      icsFilename(origin ?? "origin", destination ?? "destination"),
      itineraryIcs({ itinerary, from: null, to: null, url }),
    );
  }

  async function nativeShare() {
    const data: ShareData = {
      title: shareTitle,
      text: t("share.title"),
      url,
    };
    try {
      if (itinerary && origin && destination) {
        const file = new File(
          [itineraryIcs({ itinerary, from: null, to: null, url })],
          icsFilename(origin, destination),
          { type: "text/calendar" },
        );
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ ...data, files: [file] });
          return;
        }
      }
      await navigator.share(data);
    } catch {
      // cancelled or unsupported
    }
  }

  function openShare() {
    setCopied(false);
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    if (canShare && coarse) {
      void nativeShare();
      return;
    }
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        className="stamp"
        data-testid="share-open"
        onClick={openShare}
      >
        {t("share.open")}
      </button>
      <dialog
        ref={dialogRef}
        className="howto-dialog"
        aria-labelledby={titleId}
        data-testid="share-dialog"
      >
        <div className="howto-dialog-sheet">
          <p className="kicker">{t("share.kicker")}</p>
          <h2 id={titleId} className="font-display mt-1 text-2xl italic">
            {t("share.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {t("share.body")}
          </p>
          <label className="mt-5 block">
            <span className="kicker">{t("share.link")}</span>
            <input
              className="field mt-2"
              value={url}
              readOnly
              data-testid="share-url"
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {canShare ? (
              <button
                type="button"
                className="search-cta"
                data-testid="share-native"
                onClick={() => void nativeShare()}
              >
                {t("share.nativeShare")}
              </button>
            ) : (
              <button type="button" className="search-cta" onClick={() => void copyLink()}>
                {copied ? t("share.copied") : t("share.copy")}
              </button>
            )}
            <button type="button" className="stamp w-full" onClick={printTicket}>
              {t("share.print")}
            </button>
            <button
              type="button"
              className="stamp w-full"
              data-testid="share-calendar"
              onClick={addToCalendar}
              disabled={!itinerary}
            >
              {t("share.calendar")}
            </button>
            {canShare ? (
              <button type="button" className="stamp w-full" onClick={() => void copyLink()}>
                {copied ? t("share.copied") : t("share.copy")}
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            {t("share.printHint")}
          </p>
          <button
            type="button"
            className="search-clear mt-5"
            onClick={() => dialogRef.current?.close()}
          >
            {t("share.close")}
          </button>
        </div>
      </dialog>
    </>
  );
}
