"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HallLoader } from "@/components/status/HallLoader";
import { useI18n } from "@/i18n/provider";
import { transitAgencies } from "@/lib/carriers";
import { isTransitMode, legName } from "@/lib/format";
import type { Itinerary, SelectedPlace } from "@/lib/transit/types";
import type { MapPickMode, RouteMode } from "../hooks/use-journey-search";
import { roleForMapClick } from "../lib/pins";

const RouteMapInner = dynamic(() => import("./RouteMapInner"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="map-loading" data-testid="map-loading">
      <HallLoader label={t("map.loading")} />
    </div>
  );
}

type RouteMapProps = {
  itinerary: Itinerary | null;
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  via: Array<SelectedPlace | null>;
  routeMode: RouteMode;
  highlightCarriers?: string[];
  fitKey: number;
  pickMode: MapPickMode;
  pendingPick: SelectedPlace | null;
  pinBusy: boolean;
  onPickModeChange: (mode: MapPickMode) => void;
  onMapClick: (lat: number, lon: number) => void;
  onMarkerDrag: (
    role: "from" | "to" | `via.${number}`,
    lat: number,
    lon: number,
  ) => void;
  onAssignPending: (role: "from" | "to" | "via") => void;
};

export function RouteMap({
  itinerary,
  from,
  to,
  via,
  routeMode,
  highlightCarriers = [],
  fitKey,
  pickMode,
  pendingPick,
  pinBusy,
  onPickModeChange,
  onMapClick,
  onMarkerDrag,
  onAssignPending,
}: RouteMapProps) {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const viaNames =
    routeMode === "via"
      ? via
          .filter((stop): stop is SelectedPlace => Boolean(stop))
          .map((stop) => stop.name)
      : [];
  const nextIdleRole = roleForMapClick("idle", { from, to, via });
  const hintRole = pickMode !== "idle" ? pickMode : nextIdleRole;
  const caption =
    from && to
      ? [from.name, ...viaNames, to.name].join(" → ")
      : pendingPick
        ? t("map.pinned", { name: pendingPick.name })
        : t("map.europe");
  const carriers = itinerary ? transitAgencies(itinerary) : [];
  const transitLegs =
    itinerary?.legs.filter((leg) => isTransitMode(leg.mode)).slice(0, 4) ?? [];

  const approximate = Boolean(
    itinerary &&
      itinerary.legs.every((leg) => !leg.legGeometry?.points),
  );

  useEffect(() => {
    if (pickMode !== "idle" || full) setMapReady(true);
  }, [pickMode, full]);

  useEffect(() => {
    if (mapReady) return;
    const node = stageRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setMapReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setMapReady(true);
        observer.disconnect();
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mapReady]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (full) {
        setFull(false);
        return;
      }
      if (pickMode !== "idle") onPickModeChange("idle");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, pickMode, onPickModeChange]);

  return (
    <div
      ref={stageRef}
      className={`map-stage${pickMode !== "idle" ? " map-stage-picking" : ""}${full ? " map-stage-full" : ""}`}
      data-tour="map"
    >
      {mapReady ? (
        <RouteMapInner
          itinerary={itinerary}
          from={from}
          to={to}
          via={via}
          pendingPick={pendingPick}
          highlightCarriers={highlightCarriers}
          fitKey={fitKey}
          pickMode={pickMode}
          full={full}
          onMapClick={onMapClick}
          onMarkerDrag={onMarkerDrag}
          onToggleFull={() => setFull((value) => !value)}
        />
      ) : (
        <div className="h-full w-full" data-testid="map-pending" />
      )}
      <div className="pointer-events-none absolute top-3 left-3 z-[500] right-16">
        <div className="map-pin-bar pointer-events-auto">
          <PickStamp
            label={t("map.pinOrigin")}
            testId="pin-origin"
            active={pickMode === "from"}
            onClick={() => onPickModeChange(pickMode === "from" ? "idle" : "from")}
          />
          <PickStamp
            label={t("map.pinDestination")}
            testId="pin-destination"
            active={pickMode === "to"}
            onClick={() => onPickModeChange(pickMode === "to" ? "idle" : "to")}
          />
          <PickStamp
            label={t("map.pinVia")}
            testId="pin-via"
            active={pickMode === "via"}
            onClick={() => onPickModeChange(pickMode === "via" ? "idle" : "via")}
          />
        </div>
      </div>
      <div className="map-overlay pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[min(24rem,calc(100%-1.5rem))]">
        <div className="map-plaque pointer-events-auto px-3 py-2">
          <p className="truncate text-sm font-medium">
            {pinBusy ? t("map.reading") : caption}
          </p>
          {pendingPick && pickMode === "idle" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" className="stamp" onClick={() => onAssignPending("from")}>
                {t("map.origin")}
              </button>
              <button type="button" className="stamp" onClick={() => onAssignPending("via")}>
                {t("map.via")}
              </button>
              <button type="button" className="stamp" onClick={() => onAssignPending("to")}>
                {t("map.destination")}
              </button>
            </div>
          )}
          {!pendingPick && hintRole !== "pending" ? (
            <p className="mt-1 text-xs text-ink-muted">
              {t("map.clickToSet", {
                target:
                  hintRole === "from"
                    ? t("map.targetOrigin")
                    : hintRole === "to"
                      ? t("map.targetDestination")
                      : t("map.targetVia"),
              })}
            </p>
          ) : null}
          {approximate ? (
            <p className="mt-1 text-xs text-ink-muted">{t("map.approximate")}</p>
          ) : null}
          {(carriers.length > 0 || transitLegs.length > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {carriers.map((name) => (
                <span key={name} className="map-chip">
                  {name}
                </span>
              ))}
              {transitLegs.map((leg, index) => (
                <span
                  key={`${leg.startTime}-${index}`}
                  className="map-chip map-chip-line"
                >
                  {legName(leg) && legName(leg) !== "Walk"
                    ? legName(leg)
                    : t(`modes.${leg.mode}`)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PickStamp({
  label,
  active,
  testId,
  onClick,
}: {
  label: string;
  active: boolean;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="stamp"
      data-testid={testId}
      data-on={active}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
