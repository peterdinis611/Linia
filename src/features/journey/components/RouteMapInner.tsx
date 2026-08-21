"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IconCollapse,
  IconExpand,
  IconLayers,
  IconLocate,
  IconMinus,
  IconPlus,
  IconSatellite,
} from "@/components/icons";
import L from "leaflet";
import {
  Marker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { carrierName } from "@/lib/carriers";
import { isTransitMode, legColor, legName } from "@/lib/format";
import { pathPointsForLeg } from "@/lib/transit/path";
import type { Itinerary, SelectedPlace } from "@/lib/transit/types";
import type { MapPickMode } from "../hooks/use-journey-search";

const EUROPE_CENTER: LatLngExpression = [50.1, 10];

type Basemap = "map" | "satellite";

const TILES: Record<
  Basemap,
  { url: string; attribution: string; maxZoom: number }
> = {
  map: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
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
};

type PathLeg = {
  positions: [number, number][];
  color: string;
  dashed: boolean;
  faded: boolean;
  label: string;
};

function samePin(a: SelectedPlace, b: SelectedPlace) {
  return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4;
}

function pinIcon(kind: "from" | "to" | "via" | "pending") {
  return L.divIcon({
    className: `map-pin map-pin-${kind}`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
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
}: RouteMapInnerProps) {
  const { t } = useI18n();
  const [basemap, setBasemap] = useState<Basemap>("map");
  const { resolved } = useTheme();
  const tiles = TILES[basemap];
  const nightChart = resolved === "dark" && basemap === "map";
  const nightMap = resolved === "dark";
  const halo = nightMap
    ? "#f3e6c8"
    : basemap === "satellite"
      ? "#181410"
      : "#faf6ec";

  const paths = useMemo<PathLeg[]>(
    () =>
      itinerary?.legs
        .map((leg) => {
          const agency = carrierName(leg);
          const faded =
            highlightCarriers.length > 0 &&
            Boolean(agency) &&
            !highlightCarriers.includes(agency!);
          return {
            positions: pathPointsForLeg(leg),
            color: nightMap ? liftChartColor(legColor(leg)) : legColor(leg),
            dashed: !isTransitMode(leg.mode),
            faded,
            label: [
              isTransitMode(leg.mode) ? legName(leg) : t(`modes.${leg.mode}`),
              agency,
            ]
              .filter(Boolean)
              .join(" · "),
          };
        })
        .filter((path) => path.positions.length > 1) ?? [],
    [itinerary, highlightCarriers, nightMap, t],
  );

  const origin = from ? ([from.lat, from.lon] as LatLngExpression) : null;
  const destination = to ? ([to.lat, to.lon] as LatLngExpression) : null;
  const viaPoints = via.filter((stop): stop is SelectedPlace => Boolean(stop));
  const extraEnds = useMemo(
    () =>
      ends.filter(
        (place) =>
          (!from || !samePin(place, from)) && (!to || !samePin(place, to)),
      ),
    [ends, from, to],
  );
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

  const tileSkin = nightChart
    ? "map-tiles-night"
    : resolved === "dark" && basemap === "satellite"
      ? "map-tiles-sat-night"
      : "";

  return (
    <div className={`h-full w-full ${tileSkin}`.trim()}>
    <MapContainer
      center={EUROPE_CENTER}
      zoom={4}
      scrollWheelZoom
      zoomControl={false}
      preferCanvas
      className="h-full w-full"
    >
      <MapTileSkin skin={tileSkin} />
      <TileLayer
        key={basemap}
        attribution={tiles.attribution}
        url={tiles.url}
        maxZoom={tiles.maxZoom}
      />
      {basemap === "satellite" && (
        <TileLayer url={SATELLITE_LABELS} pane="overlayPane" />
      )}
      <FitPoints points={fitPoints} fitKey={fitKey} />
      <MapResizer />
      <MapClickCatcher pickMode={pickMode} onClick={onMapClick} />
      <MapToolbar
        basemap={basemap}
        full={full}
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
      {from && origin && (
        <Marker
          position={origin}
          draggable={!lockPins}
          icon={pinIcon("from")}
          eventHandlers={{
            dragend: (event) => {
              const latlng = event.target.getLatLng();
              onMarkerDrag("from", latlng.lat, latlng.lng);
            },
          }}
        >
          <Popup>{from.name}</Popup>
        </Marker>
      )}
      {via.map((stop, index) =>
        stop ? (
          <Marker
            key={`${stop.id}-${index}`}
            position={[stop.lat, stop.lon]}
            draggable={!lockPins}
            icon={pinIcon("via")}
            eventHandlers={{
              dragend: (event) => {
                const latlng = event.target.getLatLng();
                onMarkerDrag(`via.${index}`, latlng.lat, latlng.lng);
              },
            }}
          >
            <Popup>
              {t("map.viaStop", { n: index + 1, name: stop.name })}
            </Popup>
          </Marker>
        ) : null,
      )}
      {to && destination && (
        <Marker
          position={destination}
          draggable={!lockPins}
          icon={pinIcon("to")}
          eventHandlers={{
            dragend: (event) => {
              const latlng = event.target.getLatLng();
              onMarkerDrag("to", latlng.lat, latlng.lng);
            },
          }}
        >
          <Popup>{to.name}</Popup>
        </Marker>
      )}
      {extraEnds.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lon]}
          icon={pinIcon("to")}
        >
          <Popup>{place.name}</Popup>
        </Marker>
      ))}
      {pendingPick && (
        <Marker
          position={[pendingPick.lat, pendingPick.lon]}
          icon={pinIcon("pending")}
        >
          <Popup>{pendingPick.name}</Popup>
        </Marker>
      )}
    </MapContainer>
    </div>
  );
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
  onBasemapChange,
  onToggleFull,
}: {
  basemap: Basemap;
  full: boolean;
  onBasemapChange: (value: Basemap) => void;
  onToggleFull?: () => void;
}) {
  const map = useMap();
  const { t } = useI18n();

  function locateHere() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 14);
      },
      () => {
        // permission or timeout — stay put
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="map-chrome">
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
      <ChromeButton label={t("map.zoomIn")} className="map-chrome-zoom" onClick={() => map.zoomIn()}>
        <IconPlus />
      </ChromeButton>
      <ChromeButton label={t("map.zoomOut")} className="map-chrome-zoom" onClick={() => map.zoomOut()}>
        <IconMinus />
      </ChromeButton>
    </div>
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
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MapTileSkin({ skin }: { skin: string }) {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    el.classList.remove("map-tiles-night", "map-tiles-sat-night");
    if (skin) el.classList.add(skin);
  }, [map, skin]);

  return null;
}

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const frame = () => map.invalidateSize({ animate: false });
    frame();
    const observer = new ResizeObserver(() => frame());
    observer.observe(container);
    window.addEventListener("resize", frame);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", frame);
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
          weight: 3,
          opacity: 0.72,
          dashArray: "10 10",
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
      layers.push(
        L.polyline(path.positions, {
          color: halo,
          weight: path.dashed ? 6 : 8,
          opacity: path.faded ? 0.12 : 0.85,
          dashArray: path.dashed ? "6 8" : undefined,
          className: "journey-path-halo",
        }).addTo(map),
      );
      const line = L.polyline(path.positions, {
        color: path.color,
        weight: path.dashed ? 3 : path.faded ? 3 : 5,
        opacity: path.faded ? 0.28 : 0.96,
        dashArray: path.dashed ? "6 8" : undefined,
        className: "journey-path",
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
    map.invalidateSize({ animate: false });
    if (points.length === 0) {
      if (lastKey.current !== null) map.setView(EUROPE_CENTER, 4);
      lastKey.current = fitKey;
      lastCount.current = 0;
      return;
    }
    if (lastKey.current === fitKey && lastCount.current === points.length) return;
    lastKey.current = fitKey;
    lastCount.current = points.length;
    if (points.length >= 2) {
      map.fitBounds(points as LatLngBoundsExpression, {
        padding: [48, 72],
        maxZoom: 14,
      });
      return;
    }
    map.setView(points[0], 12);
  }, [map, points, fitKey]);

  return null;
}
