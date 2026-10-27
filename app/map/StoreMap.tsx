"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export type MapStore = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const JAPAN_CENTER: L.LatLngTuple = [36.2, 138.25];

export default function StoreMap({ stores }: { stores: MapStore[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current).setView(JAPAN_CENTER, 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    for (const s of stores) {
      const popup = document.createElement("div");
      const link = document.createElement("a");
      link.href = `/store/${s.id}`;
      link.textContent = s.name;
      link.style.fontWeight = "bold";
      const address = document.createElement("div");
      address.textContent = s.address;
      popup.append(link, address);

      // 既定のピン画像はバンドラ環境でパスが壊れるため円マーカーを使う
      L.circleMarker([s.lat, s.lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: "#e11d48",
        fillOpacity: 0.9,
      })
        .bindPopup(popup)
        .addTo(layer);
    }

    if (stores.length > 0) {
      map.fitBounds(L.latLngBounds(stores.map((s) => [s.lat, s.lng])), {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
  }, [stores]);

  return <div ref={containerRef} className="h-full w-full" />;
}
