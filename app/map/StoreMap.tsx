"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export type MapStore = {
  id: number;
  name: string;
  municipalityId: number | null;
  address: string;
  lat: number;
  lng: number;
};

const JAPAN_CENTER: L.LatLngTuple = [36.2, 138.25];

// 市町村の中心から上下左右にこの度数ぶんを最低限映す（約4km）
const FOCUS_MARGIN = 0.04;

export default function StoreMap({
  stores,
  focus,
}: {
  stores: MapStore[];
  focus: { lat: number; lng: number } | null;
}) {
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

    // 市町村が選ばれていればその中心周辺を、店舗があればそれも含めて映す
    const points: L.LatLngTuple[] = stores.map((s) => [s.lat, s.lng]);
    if (focus) {
      points.push(
        [focus.lat - FOCUS_MARGIN, focus.lng - FOCUS_MARGIN],
        [focus.lat + FOCUS_MARGIN, focus.lng + FOCUS_MARGIN],
      );
    }
    if (points.length === 0) {
      map.setView(JAPAN_CENTER, 5);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  }, [stores, focus]);

  return <div ref={containerRef} className="h-full w-full" />;
}
