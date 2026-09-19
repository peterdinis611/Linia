"use client";

import {
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
} from "@/components/icons";
import L from "leaflet";
import { Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Map,
  MapTileLayer,
  STREET_ATTR,
  STREET_DARK,
  STREET_DARK_LABELS,
  STREET_LIGHT,
  STREET_LIGHT_LABELS,
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
import { pathPointsForLeg, mapCallStops } from "@/lib/transit/path";
import type { Itinerary, Place, SelectedPlace } from "@/lib/transit/types";
import type { MapPickMode } from "../hooks/use-journey-search";
import { itineraryIsLive, legPhase, livePositionOnLeg } from "../lib/progress";
import { tightTransferAtPlace, tightTransfers } from "../lib/ticket-notes";

const EUROPE_CENTER: LatLngExpression = [50.1, 10];

type Basemap = "map" | "satellite";

const SATELLITE = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution:
    "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
  maxZoom: 19,
};

const SATELLITE_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

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
  positions: [number, number][];
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

const pinIcons: Record<string, L.DivIcon> = {};

function pinIcon(
  kind: "from" | "to" | "via" | "pending" | "call" | "xfer" | "now",
  mark = "",
) {
  const key = `${kind}:${mark}`;
  const cached = pinIcons[key];
  if (cached) return cached;
  const size =
    kind === "call"
      ? 11
      : kind === "xfer"
        ? 16
        : kind === "now"
          ? 16
          : kind === "via"
            ? 24
            : 28;
  const icon = L.divIcon({
    className: `map-pin map-pin-${kind}`,
    html: mark ? `<span class="map-seal-mark">${mark}</span>` : "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  pinIcons[key] = icon;
  return icon;
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
  const { resolved } = useTheme();
  const nightMap = resolved === "dark";
  const halo = nightMap
    ? "#f3e6c8"
    : basemap === "satellite"
      ? "#181410"
      : "#faf6ec";

  const paths = useMemo<PathLeg[]>(
    () => {
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
          return {
            positions: pathPointsForLeg(leg),
            color: delayed
              ? nightMap
                ? liftChartColor("#c8102e")
                : "#c8102e"
              : nightMap
                ? liftChartColor(legColor(leg))
                : legColor(leg),
            dashed: !isTransitMode(leg.mode),
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
        .filter((path) => path.positions.length > 1);
    },
    [itinerary, highlightCarriers, nightMap, t],
  );

  const origin = from ? ([from.lat, from.lon] as LatLngExpression) : null;
  const destination = to ? ([to.lat, to.lon] as LatLngExpression) : null;
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
  const callStops = useMemo(() => {
    if (!itinerary) return [];
    const skip = [from, to, pendingPick, ...viaPoints].filter(
      (place): place is SelectedPlace => Boolean(place),
    );
    return mapCallStops(itinerary, skip);
  }, [itinerary, from, to, pendingPick, viaPoints]);
  const transferNotes = useMemo(
    () => (itinerary ? tightTransfers(itinerary) : []),
    [itinerary],
  );
  const livePoint = useMemo(() => {
    if (!itinerary) return null;
    const riding = itinerary.legs.find(
      (leg) => isTransitMode(leg.mode) && legPhase(leg, now) === "current",
    );
    return riding ? livePositionOnLeg(riding, now) : null;
  }, [itinerary, now]);
  const previewLine = useMemo<LatLngExpression[]>(() => {
    const pins: LatLngExpression[] = [];
    if (origin) pins.push(origin);
    for (const stop of viaPoints) pins.push([stop.lat, stop.lon]);
    if (destination) pins.push(destination);
    return pins;
  }, [origin, destination, viaPoints]);
  const spurLines = useMemo<LatLngExpression[][]>(() => {
    if (!origin) return [];
    return extraEnds.map((place) => [origin, [place.lat, place.lon]]);
  }, [origin, extraEnds]);
  const previewColor = nightMap ? "#ff8b7a" : "#c8102e";

  const fitPoints = useMemo<LatLngExpression[]>(() => {
    const fromPaths = paths.flatMap((path) => path.positions);
    if (fromPaths.length > 0 && extraEnds.length === 0) return fromPaths;
    const pins: LatLngExpression[] = [...fromPaths];
    if (origin) pins.push(origin);
    for (const stop of viaPoints) pins.push([stop.lat, stop.lon]);
    if (destination) pins.push(destination);
    for (const place of extraEnds) pins.push([place.lat, place.lon]);
    return pins;
  }, [paths, origin, destination, viaPoints, extraEnds]);

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
      scrollWheelZoom="center"
      doubleClickZoom
      touchZoom="center"
      boxZoom
      preferCanvas
      className={`h-full w-full ${tileSkin}`.trim()}
    >
      <MapTileSkin skin={tileSkin} />
      {basemap === "map" ? (
        <>
          <MapTileLayer
            key={nightMap ? "esri-dark" : "esri-light"}
            url={STREET_LIGHT}
            darkUrl={STREET_DARK}
            attribution={STREET_ATTR}
            darkAttribution={STREET_ATTR}
            maxNativeZoom={16}
            maxZoom={19}
          />
          <TileLayer
            key={nightMap ? "esri-dark-labels" : "esri-light-labels"}
            url={nightMap ? STREET_DARK_LABELS : STREET_LIGHT_LABELS}
            pane="basemapLabels"
            maxNativeZoom={16}
            maxZoom={19}
            updateWhenIdle
            updateWhenZooming={false}
            keepBuffer={2}
          />
        </>
      ) : (
        <>
          <MapTileLayer
            url={SATELLITE.url}
            darkUrl={SATELLITE.url}
            attribution={SATELLITE.attribution}
            darkAttribution={SATELLITE.attribution}
            maxZoom={SATELLITE.maxZoom}
            maxNativeZoom={SATELLITE.maxZoom}
          />
          <TileLayer url={SATELLITE_LABELS} pane="basemapLabels" />
        </>
      )}
      <FitPoints points={fitPoints} fitKey={fitKey} />
      <MapResizer />
      <MapClickCatcher pickMode={pickMode} onClick={onMapClick} />
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
      {callStops.map((stop, index) => {
        const canBoard = Boolean(stop.stopId && onOpenStation && pickMode === "idle");
        const tight = tightTransferAtPlace(stop, transferNotes);
        const label = tight
          ? t("map.tightTransfer", { name: stop.name, minutes: tight.minutes })
          : t("map.callAt", { name: stop.name });
        return (
          <Marker
            key={stop.stopId ?? `${stop.name}-${stop.lat}-${index}`}
            position={[stop.lat, stop.lon]}
            icon={pinIcon(tight ? "xfer" : "call", tight ? "×" : "")}
            zIndexOffset={tight ? 200 : -80}
            title={label}
            alt={label}
            eventHandlers={{
              click: () => {
                if (!canBoard || !onOpenStation) return;
                onOpenStation(stop);
              },
            }}
          >
            {canBoard ? null : <Popup>{label}</Popup>}
          </Marker>
        );
      })}
      {livePoint ? (
        <Marker
          position={livePoint}
          icon={pinIcon("now")}
          zIndexOffset={1400}
          interactive={false}
          title={t("detail.now")}
          alt={t("detail.now")}
        />
      ) : null}
      {from && origin && (
        <Marker
          position={origin}
          draggable={!lockPins}
          icon={pinIcon("from", "A")}
          eventHandlers={{
            dragend: (event) => {
              const latlng = event.target.getLatLng();
              onMarkerDrag("from", latlng.lat, latlng.lng);
            },
          }}
        >
          <Popup>
            <p className="map-slip-kicker">{t("map.origin")}</p>
            <p className="map-slip-name">{from.name}</p>
          </Popup>
        </Marker>
      )}
      {via.map((stop, index) =>
        stop ? (
          <Marker
            key={`${stop.id}-${index}`}
            position={[stop.lat, stop.lon]}
            draggable={!lockPins}
            icon={pinIcon("via", String(index + 1))}
            eventHandlers={{
              dragend: (event) => {
                const latlng = event.target.getLatLng();
                onMarkerDrag(`via.${index}`, latlng.lat, latlng.lng);
              },
            }}
          >
            <Popup>
              <p className="map-slip-kicker">{t("map.via")}</p>
              <p className="map-slip-name">
                {t("map.viaStop", { n: index + 1, name: stop.name })}
              </p>
            </Popup>
          </Marker>
        ) : null,
      )}
      {to && destination && (
        <Marker
          position={destination}
          draggable={!lockPins}
          icon={pinIcon("to", "B")}
          eventHandlers={{
            dragend: (event) => {
              const latlng = event.target.getLatLng();
              onMarkerDrag("to", latlng.lat, latlng.lng);
            },
          }}
        >
          <Popup>
            <p className="map-slip-kicker">{t("map.destination")}</p>
            <p className="map-slip-name">{to.name}</p>
          </Popup>
        </Marker>
      )}
      {extraEnds.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lon]}
          icon={pinIcon("to", "B")}
        >
          <Popup>
            <p className="map-slip-kicker">{t("map.destination")}</p>
            <p className="map-slip-name">{place.name}</p>
          </Popup>
        </Marker>
      ))}
      {pendingPick && (
        <Marker
          position={[pendingPick.lat, pendingPick.lon]}
          icon={pinIcon("pending", "·")}
        >
          <Popup>
            <p className="map-slip-kicker">{t("map.pinned", { name: pendingPick.name })}</p>
            <p className="map-slip-name">{pendingPick.name}</p>
          </Popup>
        </Marker>
      )}
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

function MapClickCatcher({
  pickMode,
  onClick,
}: {
  pickMode: MapPickMode;
  onClick: (lat: number, lon: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.getContainer().style.cursor = pickMode === "idle" ? "" : "crosshair";
    return () => {
      map.getContainer().style.cursor = "";
    };
  }, [map, pickMode]);

  useMapEvents({
    click(event) {
      const target = event.originalEvent.target as HTMLElement | null;
      if (
        target?.closest(
          ".leaflet-marker-icon, .leaflet-popup, .leaflet-control, button, a",
        )
      ) {
        return;
      }
      onClick(event.latlng.lat, event.latlng.lng);
    },
  });

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
  fitPoints: LatLngExpression[];
  onBasemapChange: (value: Basemap) => void;
  onToggleFull?: () => void;
}) {
  const map = useMap();
  const { t } = useI18n();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const stage = map.getContainer().closest(".map-stage");
    setHost(stage instanceof HTMLElement ? stage : null);
  }, [map]);

  function locateHere() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView(
          [position.coords.latitude, position.coords.longitude],
          Math.max(map.getZoom(), 15),
        );
      },
      () => {
        // permission or timeout — stay put
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function fitTicket() {
    if (fitPoints.length >= 2) {
      map.fitBounds(fitPoints as LatLngBoundsExpression, {
        paddingTopLeft: [56, 64],
        paddingBottomRight: [28, 96],
        maxZoom: 16,
      });
      return;
    }
    if (fitPoints.length === 1) map.setView(fitPoints[0], 15);
  }

  const chrome = (
    <div className="map-chrome" role="toolbar" aria-label={t("map.view")}>
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
        onClick={() => map.zoomIn()}
      >
        <IconPlus />
      </ChromeButton>
      <ChromeButton
        label={t("map.zoomOut")}
        className="map-chrome-zoom"
        testId="map-zoom-out"
        onClick={() => map.zoomOut()}
      >
        <IconMinus />
      </ChromeButton>
    </div>
  );

  return host ? createPortal(chrome, host) : null;
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

function MapTileSkin({ skin }: { skin: string }) {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane("basemapLabels")) {
      const pane = map.createPane("basemapLabels");
      pane.style.zIndex = "350";
      pane.style.pointerEvents = "none";
    }
  }, [map]);

  useEffect(() => {
    const el = map.getContainer();
    el.classList.remove(
      "map-tiles-night",
      "map-tiles-sat-night",
      "map-tiles-paper",
      "map-tiles-ink",
    );
    for (const name of skin.split(/\s+/).filter(Boolean)) {
      el.classList.add(name);
    }
  }, [map, skin]);

  return null;
}

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let lastWidth = 0;
    let lastHeight = 0;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      map.invalidateSize({ animate: false });
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

function JourneyPaths({
  paths,
  preview,
  spurs = [],
  previewColor,
  halo,
}: {
  paths: PathLeg[];
  preview: LatLngExpression[];
  spurs?: LatLngExpression[][];
  previewColor: string;
  halo: string;
}) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    if (paths.length === 0 && preview.length >= 2) {
      layers.push(
        L.polyline(preview, {
          color: previewColor,
          weight: 3.5,
          opacity: 0.78,
          dashArray: "7 9",
          className: "journey-preview",
        }).addTo(map),
      );
    }

    for (const spur of spurs) {
      if (spur.length < 2) continue;
      layers.push(
        L.polyline(spur, {
          color: previewColor,
          weight: 2,
          opacity: 0.32,
          dashArray: "6 10",
          className: "journey-preview-spur",
        }).addTo(map),
      );
    }

    for (const path of paths) {
      const liveWeight = path.live ? 2 : 0;
      layers.push(
        L.polyline(path.positions, {
          color: halo,
          weight: (path.dashed ? 6 : 8) + liveWeight,
          opacity: path.faded ? 0.12 : path.live ? 0.95 : 0.85,
          dashArray: path.dashed ? "6 8" : undefined,
          interactive: false,
          className: "journey-path-halo",
        }).addTo(map),
      );
      const line = L.polyline(path.positions, {
        color: path.color,
        weight: (path.dashed ? 3 : path.faded ? 3 : 5) + liveWeight,
        opacity: path.faded ? 0.28 : 0.96,
        dashArray: path.dashed ? "6 8" : undefined,
        className: [
          "journey-path",
          path.live ? "journey-path-live" : "",
          path.delayed ? "journey-path-delayed" : "",
        ]
          .filter(Boolean)
          .join(" "),
      }).addTo(map);
      if (path.label) line.bindPopup(path.label);
      layers.push(line);
    }

    return () => {
      for (const layer of layers) {
        map.removeLayer(layer);
      }
    };
  }, [map, paths, preview, spurs, previewColor, halo]);

  return null;
}

function FitPoints({
  points,
  fitKey,
}: {
  points: LatLngExpression[];
  fitKey: number;
}) {
  const map = useMap();
  const lastKey = useRef<number | null>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    const appeared = lastCount.current === 0 && points.length > 0;
    const keyChanged = lastKey.current !== fitKey;
    lastCount.current = points.length;

    if (points.length === 0) {
      if (lastKey.current !== null) map.setView(EUROPE_CENTER, 4);
      lastKey.current = fitKey;
      return;
    }
    lastKey.current = fitKey;
    if (!keyChanged && !appeared) return;

    if (points.length >= 2) {
      map.fitBounds(points as LatLngBoundsExpression, {
        paddingTopLeft: [56, 64],
        paddingBottomRight: [28, 96],
        maxZoom: 16,
        animate: false,
      });
      return;
    }
    map.setView(points[0], 15);
  }, [map, points, fitKey]);

  return null;
}
