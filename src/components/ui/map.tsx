"use client";

import type {
  LatLngExpression,
  Map as LeafletMap,
  TileLayer as LeafletTileLayer,
} from "leaflet";
import type { Ref } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { MapContainerProps, TileLayerProps } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";

export const STREET_LIGHT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const STREET_LIGHT_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
export const STREET_DARK =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const STREET_DARK_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
export const STREET_ATTR =
  "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS";

export function Map({
  zoom = 4,
  maxZoom = 18,
  className,
  ...props
}: Omit<MapContainerProps, "zoomControl"> & {
  center: LatLngExpression;
  ref?: Ref<LeafletMap>;
}) {
  return (
    <MapContainer
      zoom={zoom}
      maxZoom={maxZoom}
      attributionControl={false}
      zoomControl={false}
      className={cn("size-full min-h-0 flex-1", className)}
      {...props}
    />
  );
}

export function MapTileLayer({
  url,
  attribution,
  darkUrl,
  darkAttribution,
  ...props
}: Partial<TileLayerProps> & {
  darkUrl?: string;
  darkAttribution?: string;
  ref?: Ref<LeafletTileLayer>;
}) {
  const map = useMap();
  if (map.attributionControl) {
    map.attributionControl.setPrefix("");
  }

  const { resolved } = useTheme();
  const night = resolved === "dark";
  const resolvedUrl = night
    ? (darkUrl ?? url ?? STREET_DARK)
    : (url ?? STREET_LIGHT);
  const resolvedAttribution =
    night && darkAttribution
      ? darkAttribution
      : (attribution ?? STREET_ATTR);

  return (
    <TileLayer
      url={resolvedUrl}
      attribution={resolvedAttribution}
      maxZoom={16}
      {...props}
    />
  );
}
