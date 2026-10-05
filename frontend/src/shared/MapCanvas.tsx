import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
import { Layers, MapPin, Minus, Plus, Expand, List } from "lucide-react";
import { zones, shelters } from "../domain/fixtures";
import { severity, type Incident } from "../domain/types";
const colors: Record<string, string> = {
  Safe: "#38b89a",
  Low: "#38b89a",
  Moderate: "#e3b343",
  High: "#e6984b",
  Critical: "#ef6273",
  Unknown: "#889bb5",
};
export function MapView({
  selected = "Z-01",
  onSelect,
  incidents = [],
  large = false,
  light = false,
}: {
  selected?: string;
  onSelect?: (id: string) => void;
  incidents?: Incident[];
  large?: boolean;
  light?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [basemapError, setBasemapError] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [list, setList] = useState(false);
  const [showSensors, setShowSensors] = useState(true);
  const [showShelters, setShowShelters] = useState(false);
  const selectedRef = useRef(onSelect);
  selectedRef.current = onSelect;
  useEffect(() => {
    if (!container.current) return;
    try {
      const m = new maplibregl.Map({
        container: container.current,
        center: [91.739, 26.163],
        zoom: 11.15,
        minZoom: 8,
        maxZoom: 17,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            base: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": light ? "#e5ebf3" : "#15253b" },
            },
            {
              id: "base",
              type: "raster",
              source: "base",
              paint: {
                "raster-opacity": light ? 0.76 : 0.4,
                "raster-saturation": -0.85,
                "raster-brightness-max": light ? 0.96 : 0.45,
              },
            },
          ],
        },
      });
      map.current = m;
      m.on("error", () => {
        setBasemapError(true);
        setList(true);
      });
      m.on("load", () => {
        const data = {
          type: "FeatureCollection" as const,
          features: zones.map((z) => {
            const [x, y] = z.center;
            return {
              type: "Feature" as const,
              properties: {
                id: z.id,
                name: z.name,
                color: colors[severity(z.risk)],
              },
              geometry: {
                type: "Polygon" as const,
                coordinates: [
                  [
                    [x - 0.031, y - 0.017],
                    [x + 0.03, y - 0.02],
                    [x + 0.038, y + 0.012],
                    [x - 0.012, y + 0.022],
                    [x - 0.031, y - 0.017],
                  ],
                ],
              },
            };
          }),
        };
        m.addSource("zones", { type: "geojson", data });
        m.addLayer({
          id: "zone-fill",
          type: "fill",
          source: "zones",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.13 },
        });
        m.addLayer({
          id: "zone-line",
          type: "line",
          source: "zones",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 1.5,
            "line-dasharray": [3, 2],
          },
        });
        m.addSource("points", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: zones.map((z) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: z.center },
              properties: { id: z.id, color: colors[severity(z.risk)] },
            })),
          },
        });
        m.addLayer({
          id: "points",
          type: "circle",
          source: "points",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": 7,
            "circle-stroke-color": light ? "#fff" : "#14212d",
            "circle-stroke-width": 3,
          },
        });
        m.addSource("sensors", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: zones.flatMap((z) =>
              Array.from({ length: z.sensors }, (_, i) => ({
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: [
                    z.center[0] + (i - 1) * 0.008,
                    z.center[1] + 0.01 + (i % 2) * 0.007,
                  ],
                },
                properties: {},
              })),
            ),
          },
        });
        m.addLayer({
          id: "sensors",
          type: "circle",
          source: "sensors",
          paint: {
            "circle-radius": 3.5,
            "circle-color": "#91bdd2",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",
          },
        });
        m.addSource("shelters", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: shelters.map((s) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: s.center },
              properties: {},
            })),
          },
        });
        m.addLayer({
          id: "shelters",
          type: "circle",
          source: "shelters",
          layout: { visibility: "none" },
          paint: {
            "circle-radius": 6,
            "circle-color": "#70bdaa",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });
        m.addSource("incidents", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        m.addLayer({
          id: "incidents",
          type: "circle",
          source: "incidents",
          paint: {
            "circle-color": "#dc2626",
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });
        m.on("click", "zone-fill", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) selectedRef.current?.(id);
        });
        m.on(
          "mouseenter",
          "zone-fill",
          () => (m.getCanvas().style.cursor = "pointer"),
        );
        m.on(
          "mouseleave",
          "zone-fill",
          () => (m.getCanvas().style.cursor = ""),
        );
        setReady(true);
      });
      const observer = new ResizeObserver(() => m.resize());
      observer.observe(container.current);
      return () => {
        observer.disconnect();
        m.remove();
        map.current = null;
      };
    } catch {
      setBasemapError(true);
      setList(true);
    }
  }, [light]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const source = map.current.getSource(
      "incidents",
    ) as maplibregl.GeoJSONSource;
    source?.setData({
      type: "FeatureCollection",
      features: incidents
        .filter((i) => !["Resolved", "Closed"].includes(i.status))
        .map((i, n) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              (zones.find((z) => z.id === i.zoneId)?.center[0] || 91.72) +
                0.008 +
                n * 0.002,
              (zones.find((z) => z.id === i.zoneId)?.center[1] || 26.18) -
                0.008,
            ],
          },
          properties: { id: i.id },
        })),
    });
  }, [incidents, ready]);
  useEffect(() => {
    if (!ready) return;
    map.current?.setLayoutProperty(
      "sensors",
      "visibility",
      showSensors ? "visible" : "none",
    );
    map.current?.setLayoutProperty(
      "shelters",
      "visibility",
      showShelters ? "visible" : "none",
    );
  }, [ready, showSensors, showShelters]);
  const fly = (id: string) => {
    const zone = zones.find((z) => z.id === id);
    if (zone) {
      map.current?.easeTo({ center: zone.center, zoom: 11.5, duration: 300 });
      onSelect?.(id);
    }
  };
  return (
    <div
      className={`map-shell ${large ? "large" : ""} ${light ? "map-light" : ""}`}
    >
      <div
        ref={container}
        className="map-canvas"
        aria-label="Interactive demonstration risk map"
      />
      <div className="map-label">
        <span className="map-crosshair" />
        <div>
          <strong>BRAHMAPUTRA BASIN</strong>
          <small>Guwahati · illustrative demo zones</small>
        </div>
      </div>
      <div className="map-controls">
        <button aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={17} />
        </button>
        <button aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus size={17} />
        </button>
        <button
          aria-label="Reset map extent"
          onClick={() =>
            map.current?.easeTo({ center: [91.739, 26.163], zoom: 11.15 })
          }
        >
          <Expand size={16} />
        </button>
        <button
          aria-label="Map layers"
          aria-expanded={showLayers}
          onClick={() => setShowLayers(!showLayers)}
        >
          <Layers size={17} />
        </button>
        <button
          aria-label="Toggle equivalent zone list"
          aria-pressed={list}
          onClick={() => setList(!list)}
        >
          <List size={17} />
        </button>
      </div>
      {showLayers && (
        <div className="map-layer-menu">
          <strong>Map layers</strong>
          <label>
            <input
              type="checkbox"
              checked={showSensors}
              onChange={(e) => setShowSensors(e.target.checked)}
            />{" "}
            Sensor nodes
          </label>
          <label>
            <input
              type="checkbox"
              checked={showShelters}
              onChange={(e) => setShowShelters(e.target.checked)}
            />{" "}
            Shelters
          </label>
          <small>Zone boundaries are illustrative.</small>
        </div>
      )}
      {list && (
        <div className="map-zone-list">
          {zones.map((z) => (
            <button key={z.id} onClick={() => fly(z.id)}>
              <MapPin size={14} />
              {z.name}
              <span>{severity(z.risk)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="map-zone-pills">
        {zones.slice(0, 3).map((z) => (
          <button
            key={z.id}
            className={selected === z.id ? "selected" : ""}
            onClick={() => fly(z.id)}
          >
            <span style={{ background: colors[severity(z.risk)] }} />
            {z.name}
          </button>
        ))}
      </div>
      <div className="map-legend">
        <span>SCENARIO RISK</span>
        {["Low", "Moderate", "High", "Critical", "Unknown"].map((s) => (
          <span key={s}>
            <i style={{ background: colors[s] }} />
            {s}
          </span>
        ))}
      </div>
      {basemapError && (
        <div className="map-fallback">
          Map unavailable or incomplete · use the equivalent zone list
        </div>
      )}
    </div>
  );
}
