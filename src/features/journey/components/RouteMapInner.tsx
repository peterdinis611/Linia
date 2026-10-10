"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  IconCollapse,
  IconExpand,
  IconFit,
  IconLayers,
  IconLocate,
  IconMinus,
  IconPlus,
  IconSatellite,
  IconTools,
} from "@/components/icons";
import type {
  LngLatBoundsLike,
  Map as MapLibreMap,
  MapMouseEvent,
  StyleSpecification,
} from "maplibre-gl";
import {
  Map,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";
import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { carrierName } from "@/lib/carriers";
import {
  delayMinutes,
  isTransitMode,
  legColor,
  legName,
  liveTransitLegIndex,
} from "@/lib/format";
import {
  mapCallStops,
  pathPointsForLeg,
  simplifyPath,
} from "@/lib/transit/path";
import type { Itinerary, Place, SelectedPlace } from "@/lib/transit/types";
import type { MapPickMode } from "../hooks/use-journey-search";
import { itineraryIsLive, legPhase, livePositionOnLeg } from "../lib/progress";
import { tightTransferAtPlace, tightTransfers } from "../lib/ticket-notes";

const EUROPE_CENTER: [number, number] = [10, 50.1];
const CALL_ZOOM = 9;
const CALL_MAX = 28;
const PATH_MAX_POINTS = 200;

type Basemap = "map" | "satellite";

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
    labels: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "esri", type: "raster", source: "esri" },
    { id: "labels", type: "raster", source: "labels" },
  ],
};

type RouteMapInnerProps = {
  itinerary: Itinerary | null;
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  via: Array<SelectedPlace | null>;
  ends?: SelectedPlace[];
  pendingPick: SelectedPlace | null;
  highlightCarriers?: string[];
  fitKey: number;
  pickMode: MapPickMode;
  full?: boolean;
  lockPins?: boolean;
  onMapClick: (lat: number, lon: number) => void;
  onMarkerDrag: (
    role: "from" | "to" | `via.${number}`,
    lat: number,
    lon: number,
  ) => void;
  onToggleFull?: () => void;
  onOpenStation?: (place: Place) => void;
};

type PathLeg = {
  id: string;
  /** MapLibre order: [lng, lat] */
  coordinates: [number, number][];
  color: string;
  dashed: boolean;
  faded: boolean;
  live: boolean;
  delayed: boolean;
  label: string;
};

function samePin(a: SelectedPlace, b: SelectedPlace) {
  return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4;
}

function latLonToLngLat(points: [number, number][]): [number, number][] {
  return points.map(([lat, lon]) => [lon, lat]);
}

function pathWantsHalo(path: PathLeg) {
  return path.live || (!path.faded && !path.dashed);
}

function liftChartColor(hex: string): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance >= 0.48) return hex;
  const t = 0.46;
  const mix = (channel: number) => Math.round(channel + (247 - channel) * t);
  return `#${[mix(r), mix(g), mix(b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function stageFitPadding(map: MapLibreMap): {
  padding: { top: number; bottom: number; left: number; right: number };
  maxZoom: number;
} {
  const fallback = {
    padding: { top: 64, bottom: 96, left: 56, right: 28 },
    maxZoom: 16,
  };
  const stage = map.getContainer().closest(".map-stage");
  if (!(stage instanceof HTMLElement)) return fallback;
  const stageBox = stage.getBoundingClientRect();
  if (stageBox.width < 2 || stageBox.height < 2) return fallback;

  const pin = stage.querySelector(".map-pin-dock");
  const plaque = stage.querySelector(".map-overlay");
  const chrome = stage.querySelector(".map-chrome");
  const pinBox = pin?.getBoundingClientRect();
  const plaqueBox = plaque?.getBoundingClientRect();
  const chromeBox = chrome?.getBoundingClientRect();

  return {
    padding: {
      top: pinBox
        ? Math.max(48, Math.round(pinBox.bottom - stageBox.top + 10))
        : 64,
      left: pinBox
        ? Math.max(48, Math.round(pinBox.right - stageBox.left + 10))
        : 56,
      bottom: plaqueBox
        ? Math.max(56, Math.round(stageBox.bottom - plaqueBox.top + 10))
        : 96,
      right: chromeBox
        ? Math.max(28, Math.round(stageBox.right - chromeBox.left + 10))
        : 28,
    },
    maxZoom: 16,
  };
}

function PinSeal({
  kind,
  mark = "",
}: {
  kind: "from" | "to" | "via" | "pending" | "call" | "xfer" | "now";
  mark?: string;
}) {
  return (
    <span className={`map-pin map-pin-${kind}`} title={mark || undefined}>
      {mark ? <span className="map-seal-mark">{mark}</span> : null}
    </span>
  );
}

export default function RouteMapInner({
  itinerary,
  from,
  to,
  via,
  ends = [],
  pendingPick,
  highlightCarriers = [],
  fitKey,
  pickMode,
  full = false,
  lockPins = false,
  onMapClick,
  onMarkerDrag,
  onToggleFull,
  onOpenStation,
}: RouteMapInnerProps) {
  const { t } = useI18n();
  const now = useNow(Boolean(itinerary && itineraryIsLive(itinerary)));
  const [basemap, setBasemap] = useState<Basemap>("map");
  const [satLabelsReady, setSatLabelsReady] = useState(false);
  const { resolved } = useTheme();
  const nightMap = resolved === "dark";
  const halo = nightMap
    ? "#f3e6c8"
    : basemap === "satellite"
      ? "#181410"
      : "#faf6ec";

  useEffect(() => {
    if (basemap === "satellite") setSatLabelsReady(true);
  }, [basemap]);

  const paths = useMemo<PathLeg[]>(() => {
    if (!itinerary) return [];
    const liveIndex = liveTransitLegIndex(itinerary);
    return itinerary.legs
      .map((leg, index) => {
        const agency = carrierName(leg);
        const faded =
          highlightCarriers.length > 0 &&
          Boolean(agency) &&
          !highlightCarriers.includes(agency!);
        const delay = delayMinutes(leg);
        const delayed = (delay ?? 0) > 0;
        const live = index === liveIndex && isTransitMode(leg.mode);
        const dashed = !isTransitMode(leg.mode);
        const coordinates = latLonToLngLat(
          simplifyPath(pathPointsForLeg(leg), PATH_MAX_POINTS),
        );
        const id = [
          leg.tripId ?? leg.routeShortName ?? index,
          leg.mode,
          dashed ? "d" : "s",
          faded ? "f" : "o",
          live ? "L" : "x",
          delayed ? "D" : "x",
          coordinates.length,
        ].join(":");
        return {
          id,
          coordinates,
          color: delayed
            ? nightMap
              ? liftChartColor("#c8102e")
              : "#c8102e"
            : nightMap
              ? liftChartColor(legColor(leg))
              : legColor(leg),
          dashed,
          faded,
          live,
          delayed,
          label: [
            isTransitMode(leg.mode) ? legName(leg) : t(`modes.${leg.mode}`),
            agency,
            live ? t("detail.now") : null,
            delayed && delay != null
              ? t("detail.delayLate", { minutes: delay })
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
        };
      })
      .filter((path) => path.coordinates.length > 1);
  }, [itinerary, highlightCarriers, nightMap, t]);

  const viaPoints = useMemo(
    () => via.filter((stop): stop is SelectedPlace => Boolean(stop)),
    [via],
  );
  const extraEnds = useMemo(
    () =>
      ends.filter(
        (place) =>
          (!from || !samePin(place, from)) && (!to || !samePin(place, to)),
      ),
    [ends, from, to],
  );
  const callSkip = useMemo(
    () =>
      [from, to, pendingPick, ...viaPoints].filter(
        (place): place is SelectedPlace => Boolean(place),
      ),
    [from, to, pendingPick, viaPoints],
  );
  const transferNotes = useMemo(
    () => (itinerary ? tightTransfers(itinerary) : []),
    [itinerary],
  );
  const livePoint = useMemo(() => {
    if (!itinerary) return null;
    const riding = itinerary.legs.find(
      (leg) => isTransitMode(leg.mode) && legPhase(leg, now) === "current",
    );
    const point = riding ? livePositionOnLeg(riding, now) : null;
    return point ? ([point[1], point[0]] as [number, number]) : null;
  }, [itinerary, now]);

  const previewLine = useMemo<[number, number][]>(() => {
    const pins: [number, number][] = [];
    if (from) pins.push([from.lon, from.lat]);
    for (const stop of viaPoints) pins.push([stop.lon, stop.lat]);
    if (to) pins.push([to.lon, to.lat]);
    return pins;
  }, [from, to, viaPoints]);

  const spurLines = useMemo<[number, number][][]>(() => {
    if (!from) return [];
    return extraEnds.map((place) => [
      [from.lon, from.lat],
      [place.lon, place.lat],
    ]);
  }, [from, extraEnds]);

  const previewColor = nightMap ? "#ff8b7a" : "#c8102e";

  const fitPoints = useMemo<[number, number][]>(() => {
    const fromPaths = paths.flatMap((path) => path.coordinates);
    if (fromPaths.length > 0 && extraEnds.length === 0) return fromPaths;
    const pins: [number, number][] = [...fromPaths];
    if (from) pins.push([from.lon, from.lat]);
    for (const stop of viaPoints) pins.push([stop.lon, stop.lat]);
    if (to) pins.push([to.lon, to.lat]);
    for (const place of extraEnds) pins.push([place.lon, place.lat]);
    return pins;
  }, [paths, from, to, viaPoints, extraEnds]);

  const mapStyles = useMemo(() => {
    if (basemap !== "satellite") return undefined;
    const style = satLabelsReady
      ? SATELLITE_STYLE
      : ({
          ...SATELLITE_STYLE,
          sources: { esri: SATELLITE_STYLE.sources.esri },
          layers: [{ id: "esri", type: "raster" as const, source: "esri" }],
        } satisfies StyleSpecification);
    return { light: style, dark: style };
  }, [basemap, satLabelsReady]);

  const tileSkin = [
    basemap === "map" && !nightMap ? "map-tiles-paper" : "",
    basemap === "map" && nightMap ? "map-tiles-ink" : "",
    nightMap && basemap === "satellite" ? "map-tiles-sat-night" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`h-full w-full ${tileSkin}`.trim()}>
      <Map
        center={EUROPE_CENTER}
        zoom={4}
        minZoom={2}
        maxZoom={19}
        theme={nightMap ? "dark" : "light"}
        styles={mapStyles}
        className={`h-full w-full ${tileSkin}`.trim()}
        attributionControl={{ compact: true }}
      >
        <MapResizer />
        <MapClickCatcher pickMode={pickMode} onClick={onMapClick} />
        <FitPoints points={fitPoints} fitKey={fitKey} />
        <MapToolbar
          basemap={basemap}
          full={full}
          fitPoints={fitPoints}
          onBasemapChange={setBasemap}
          onToggleFull={onToggleFull}
        />
        <JourneyPaths
          paths={paths}
          preview={previewLine}
          spurs={spurLines}
          previewColor={previewColor}
          halo={halo}
        />
        <CallStopMarkers
          itinerary={itinerary}
          skip={callSkip}
          transferNotes={transferNotes}
          pickMode={pickMode}
          onOpenStation={onOpenStation}
        />
        {livePoint ? (
          <MapMarker longitude={livePoint[0]} latitude={livePoint[1]}>
            <MarkerContent className="map-pin-host">
              <PinSeal kind="now" />
            </MarkerContent>
          </MapMarker>
        ) : null}
        {from ? (
          <MapMarker
            longitude={from.lon}
            latitude={from.lat}
            draggable={!lockPins}
            onDragEnd={({ lat, lng }) => onMarkerDrag("from", lat, lng)}
          >
            <MarkerContent className="map-pin-host">
              <PinSeal kind="from" mark="A" />
            </MarkerContent>
            <MarkerPopup className="map-slip">
              <p className="map-slip-kicker">{t("map.origin")}</p>
              <p className="map-slip-name">{from.name}</p>
            </MarkerPopup>
          </MapMarker>
        ) : null}
        {via.map((stop, index) =>
          stop ? (
            <MapMarker
              key={`${stop.id}-${index}`}
              longitude={stop.lon}
              latitude={stop.lat}
              draggable={!lockPins}
              onDragEnd={({ lat, lng }) =>
                onMarkerDrag(`via.${index}`, lat, lng)
              }
            >
              <MarkerContent className="map-pin-host">
                <PinSeal kind="via" mark={String(index + 1)} />
              </MarkerContent>
              <MarkerPopup className="map-slip">
                <p className="map-slip-kicker">{t("map.via")}</p>
                <p className="map-slip-name">
                  {t("map.viaStop", { n: index + 1, name: stop.name })}
                </p>
              </MarkerPopup>
            </MapMarker>
          ) : null,
        )}
        {to ? (
          <MapMarker
            longitude={to.lon}
            latitude={to.lat}
            draggable={!lockPins}
            onDragEnd={({ lat, lng }) => onMarkerDrag("to", lat, lng)}
          >
            <MarkerContent className="map-pin-host">
              <PinSeal kind="to" mark="B" />
            </MarkerContent>
            <MarkerPopup className="map-slip">
              <p className="map-slip-kicker">{t("map.destination")}</p>
              <p className="map-slip-name">{to.name}</p>
            </MarkerPopup>
          </MapMarker>
        ) : null}
        {extraEnds.map((place) => (
          <MapMarker
            key={place.id}
            longitude={place.lon}
            latitude={place.lat}
          >
            <MarkerContent className="map-pin-host">
              <PinSeal kind="to" mark="B" />
            </MarkerContent>
            <MarkerPopup className="map-slip">
              <p className="map-slip-kicker">{t("map.destination")}</p>
              <p className="map-slip-name">{place.name}</p>
            </MarkerPopup>
          </MapMarker>
        ))}
        {pendingPick ? (
          <MapMarker
            longitude={pendingPick.lon}
            latitude={pendingPick.lat}
          >
            <MarkerContent className="map-pin-host">
              <PinSeal kind="pending" mark="·" />
            </MarkerContent>
            <MarkerPopup className="map-slip">
              <p className="map-slip-kicker">
                {t("map.pinned", { name: pendingPick.name })}
              </p>
              <p className="map-slip-name">{pendingPick.name}</p>
            </MarkerPopup>
          </MapMarker>
        ) : null}
      </Map>
    </div>
  );
}

function useNow(live: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, [live]);
  return now;
}

function useNarrowChrome() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 63.99rem)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

function MapClickCatcher({
  pickMode,
  onClick,
}: {
  pickMode: MapPickMode;
  onClick: (lat: number, lon: number) => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map) return;
    map.getCanvas().style.cursor = pickMode === "idle" ? "" : "crosshair";
    return () => {
      map.getCanvas().style.cursor = "";
    };
  }, [map, pickMode]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const handle = (event: MapMouseEvent) => {
      const target = event.originalEvent.target as HTMLElement | null;
      if (
        target?.closest(
          ".maplibregl-marker, .maplibregl-popup, .map-chrome, button, a",
        )
      ) {
        return;
      }
      onClick(event.lngLat.lat, event.lngLat.lng);
    };
    map.on("click", handle);
    return () => {
      map.off("click", handle);
    };
  }, [map, isLoaded, onClick]);

  return null;
}

function MapToolbar({
  basemap,
  full,
  fitPoints,
  onBasemapChange,
  onToggleFull,
}: {
  basemap: Basemap;
  full: boolean;
  fitPoints: [number, number][];
  onBasemapChange: (value: Basemap) => void;
  onToggleFull?: () => void;
}) {
  const { map } = useMap();
  const { t } = useI18n();
  const narrow = useNarrowChrome();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const showTools = !narrow || toolsOpen;

  useEffect(() => {
    if (!map) return;
    const stage = map.getContainer().closest(".map-stage");
    setHost(stage instanceof HTMLElement ? stage : null);
  }, [map]);

  useEffect(() => {
    if (!narrow) setToolsOpen(false);
  }, [narrow]);

  function locateHere() {
    if (!navigator.geolocation || !map) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.easeTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: Math.max(map.getZoom(), 15),
          duration: 600,
        });
      },
      () => {
        // permission or timeout — stay put
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function fitTicket() {
    if (!map) return;
    fitMapToPoints(map, fitPoints);
  }

  const chrome = (
    <div
      className="map-chrome"
      role="toolbar"
      aria-label={t("map.view")}
      data-collapsed={narrow && !toolsOpen ? "true" : undefined}
    >
      {narrow ? (
        <ChromeButton
          label={toolsOpen ? t("map.hideTools") : t("map.tools")}
          pressed={toolsOpen}
          testId="map-tools"
          onClick={() => setToolsOpen((open) => !open)}
        >
          {toolsOpen ? <IconCollapse /> : <IconTools />}
        </ChromeButton>
      ) : null}
      {showTools ? (
        <>
          <ChromeButton
            label={t("map.mapLabel")}
            pressed={basemap === "map"}
            onClick={() => onBasemapChange("map")}
          >
            <IconLayers />
          </ChromeButton>
          <ChromeButton
            label={t("map.satelliteLabel")}
            pressed={basemap === "satellite"}
            onClick={() => onBasemapChange("satellite")}
          >
            <IconSatellite />
          </ChromeButton>
          <ChromeButton
            label={t("map.here")}
            testId="map-here"
            onClick={locateHere}
          >
            <IconLocate />
          </ChromeButton>
          {fitPoints.length > 0 ? (
            <ChromeButton
              label={t("map.fitTicket")}
              testId="map-fit"
              onClick={fitTicket}
            >
              <IconFit />
            </ChromeButton>
          ) : null}
          {onToggleFull ? (
            <ChromeButton
              label={full ? t("map.exitFullscreen") : t("map.fullscreen")}
              testId="map-fullscreen"
              pressed={full}
              onClick={onToggleFull}
            >
              {full ? <IconCollapse /> : <IconExpand />}
            </ChromeButton>
          ) : null}
          <ChromeButton
            label={t("map.zoomIn")}
            className="map-chrome-zoom"
            testId="map-zoom-in"
            onClick={() => map?.zoomIn({ duration: 200 })}
          >
            <IconPlus />
          </ChromeButton>
          <ChromeButton
            label={t("map.zoomOut")}
            className="map-chrome-zoom"
            testId="map-zoom-out"
            onClick={() => map?.zoomOut({ duration: 200 })}
          >
            <IconMinus />
          </ChromeButton>
        </>
      ) : null}
    </div>
  );

  return host ? createPortal(chrome, host) : null;
}

function fitMapToPoints(map: MapLibreMap, points: [number, number][]) {
  if (points.length === 0) return;
  if (points.length === 1) {
    map.easeTo({ center: points[0], zoom: 15, duration: 0 });
    return;
  }
  let minLng = points[0]![0];
  let minLat = points[0]![1];
  let maxLng = minLng;
  let maxLat = minLat;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const { padding, maxZoom } = stageFitPadding(map);
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as LngLatBoundsLike,
    { padding, maxZoom, duration: 0 },
  );
}

function ChromeButton({
  label,
  pressed,
  testId,
  className,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  testId?: string;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      data-on={pressed || undefined}
      data-testid={testId}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MapResizer() {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    let lastWidth = 0;
    let lastHeight = 0;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const stage = container.closest(".map-stage");
      if (stage instanceof HTMLElement) {
        const style = getComputedStyle(stage);
        if (style.display === "none" || style.visibility === "hidden") return;
      }
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width < 2 || height < 2) return;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      map.resize();
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

function CallStopMarkers({
  itinerary,
  skip,
  transferNotes,
  pickMode,
  onOpenStation,
}: {
  itinerary: Itinerary | null;
  skip: SelectedPlace[];
  transferNotes: ReturnType<typeof tightTransfers>;
  pickMode: MapPickMode;
  onOpenStation?: (place: Place) => void;
}) {
  const { map, isLoaded } = useMap();
  const { t } = useI18n();
  const [zoom, setZoom] = useState(4);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const sync = () => setZoom(map.getZoom());
    sync();
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
    };
  }, [map, isLoaded]);

  const callStops = useMemo(() => {
    if (!itinerary) return [];
    const all = mapCallStops(itinerary, skip, {
      max: zoom >= CALL_ZOOM ? CALL_MAX : undefined,
    });
    if (zoom >= CALL_ZOOM) return all;
    return all.filter((stop) => tightTransferAtPlace(stop, transferNotes));
  }, [itinerary, skip, transferNotes, zoom]);

  return (
    <>
      {callStops.map((stop, index) => {
        const canBoard = Boolean(
          stop.stopId && onOpenStation && pickMode === "idle",
        );
        const tight = tightTransferAtPlace(stop, transferNotes);
        const label = tight
          ? t("map.tightTransfer", {
              name: stop.name,
              minutes: tight.minutes,
            })
          : t("map.callAt", { name: stop.name });
        return (
          <MapMarker
            key={stop.stopId ?? `${stop.name}-${stop.lat}-${index}`}
            longitude={stop.lon}
            latitude={stop.lat}
            onClick={() => {
              if (!canBoard || !onOpenStation) return;
              onOpenStation(stop);
            }}
          >
            <MarkerContent className="map-pin-host">
              <span title={label}>
                <PinSeal
                  kind={tight ? "xfer" : "call"}
                  mark={tight ? "×" : ""}
                />
              </span>
            </MarkerContent>
            {canBoard ? null : (
              <MarkerPopup className="map-slip">{label}</MarkerPopup>
            )}
          </MapMarker>
        );
      })}
    </>
  );
}

function JourneyPaths({
  paths,
  preview,
  spurs = [],
  previewColor,
  halo,
}: {
  paths: PathLeg[];
  preview: [number, number][];
  spurs?: [number, number][][];
  previewColor: string;
  halo: string;
}) {
  return (
    <>
      {paths.length === 0 && preview.length >= 2 ? (
        <MapRoute
          id="preview"
          coordinates={preview}
          color={previewColor}
          width={3.5}
          opacity={0.78}
          dashArray={[2, 2]}
          interactive={false}
        />
      ) : null}
      {spurs.map((spur, index) =>
        spur.length >= 2 ? (
          <MapRoute
            key={`spur-${index}`}
            id={`spur-${index}`}
            coordinates={spur}
            color={previewColor}
            width={2}
            opacity={0.32}
            dashArray={[2, 2]}
            interactive={false}
          />
        ) : null,
      )}
      {paths.map((path) => {
        const liveWeight = path.live ? 2 : 0;
        const wantHalo = pathWantsHalo(path);
        return (
          <Fragment key={path.id}>
            {wantHalo ? (
              <MapRoute
                id={`${path.id}-halo`}
                coordinates={path.coordinates}
                color={halo}
                width={(path.dashed ? 6 : 8) + liveWeight}
                opacity={path.faded ? 0.12 : path.live ? 0.95 : 0.85}
                dashArray={path.dashed ? [2, 2] : undefined}
                interactive={false}
              />
            ) : null}
            <MapRoute
              id={path.id}
              coordinates={path.coordinates}
              color={path.color}
              width={(path.dashed ? 3 : path.faded ? 3 : 5) + liveWeight}
              opacity={path.faded ? 0.28 : 0.96}
              dashArray={path.dashed ? [2, 2] : undefined}
              active={path.live}
              interactive={false}
            />
          </Fragment>
        );
      })}
    </>
  );
}

function FitPoints({
  points,
  fitKey,
}: {
  points: [number, number][];
  fitKey: number;
}) {
  const { map, isLoaded } = useMap();
  const lastKey = useRef<number | null>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const appeared = lastCount.current === 0 && points.length > 0;
    const keyChanged = lastKey.current !== fitKey;
    lastCount.current = points.length;

    if (points.length === 0) {
      if (lastKey.current !== null) {
        map.jumpTo({ center: EUROPE_CENTER, zoom: 4 });
      }
      lastKey.current = fitKey;
      return;
    }
    lastKey.current = fitKey;
    if (!keyChanged && !appeared) return;
    fitMapToPoints(map, points);
  }, [map, isLoaded, points, fitKey]);

  return null;
}
