"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { geocodeAddresses, type LatLng } from "@/lib/geocode";
import { THEME, outfit } from "../theme";
import type { MapStore } from "./StoreMap";

// Leaflet は window を参照するため SSR しない
const StoreMap = dynamic(() => import("./StoreMap"), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-center text-[color:var(--muted-foreground)]">地図を読み込み中...</p>
  ),
});

async function loadMapStores(): Promise<{ stores: MapStore[]; failed: number }> {
  // 住所は店舗（store.adress）から取得する
  const { data: storeRows, error } = await supabase
    .from("store")
    .select("id, name, munisipality_id, adress")
    .not("adress", "is", null);
  if (error) throw error;

  const withAddress = (storeRows ?? [])
    .map((row) => ({
      id: Number(row.id),
      name: row.name as string,
      municipalityId: row.munisipality_id == null ? null : Number(row.munisipality_id),
      address: ((row.adress as string | null) ?? "").trim(),
    }))
    .filter((s) => s.address);

  const points = await geocodeAddresses(withAddress.map((s) => s.address));

  const stores: MapStore[] = [];
  let failed = 0;
  for (const s of withAddress) {
    const point = points.get(s.address);
    if (point) {
      stores.push({ ...s, ...point });
    } else {
      failed++;
    }
  }
  return { stores, failed };
}

type Municipality = { id: number; name: string };

function MapContent() {
  const [filterMunicipalityId, setFilterMunicipalityId] = useState(
    useSearchParams().get("municipality") ?? "",
  );
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [allStores, setAllStores] = useState<MapStore[]>([]);
  const [failed, setFailed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMapStores()
      .then((result) => {
        setAllStores(result.stores);
        setFailed(result.failed);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "店舗情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    supabase
      .from("municipality")
      .select("id, name")
      .order("id")
      .then(({ data }) =>
        setMunicipalities((data ?? []).map((m) => ({ id: Number(m.id), name: m.name as string }))),
      );
  }, []);

  // 選択中の市町村の中心を求めて、地図をその市町村にズームさせる
  const [focusResult, setFocusResult] = useState<{ name: string; point: LatLng | null } | null>(
    null,
  );
  const selectedName = municipalities.find((m) => String(m.id) === filterMunicipalityId)?.name;
  useEffect(() => {
    if (!selectedName) return;
    let cancelled = false;
    const query = `沖縄県${selectedName}`;
    geocodeAddresses([query]).then((points) => {
      if (!cancelled) setFocusResult({ name: selectedName, point: points.get(query) ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedName]);

  const focus = focusResult && focusResult.name === selectedName ? focusResult.point : null;

  // 市町村で絞り込む。絞り込み結果に合わせて地図の表示範囲（ズーム）も変わる
  const stores = useMemo(
    () =>
      filterMunicipalityId === ""
        ? allStores
        : allStores.filter((s) => s.municipalityId === Number(filterMunicipalityId)),
    [allStores, filterMunicipalityId],
  );

  return (
    <div
      className={`flex h-dvh flex-col bg-[color:var(--background)] ${outfit.className}`}
      style={THEME}
    >
      <header className="flex items-center justify-between gap-3 bg-[color:var(--secondary)] px-5 py-3 text-white">
        <Link
          href={filterMunicipalityId ? `/?municipality=${filterMunicipalityId}` : "/"}
          className="text-sm font-bold hover:underline">
          ← 店舗一覧に戻る
        </Link>
        <select
          value={filterMunicipalityId}
          onChange={(e) => setFilterMunicipalityId(e.target.value)}
          aria-label="市町村で絞り込み"
          className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[color:var(--foreground)] outline-none"
        >
          <option value="">すべての市町村</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <p className="text-sm font-bold">
          {loading ? "住所を検索中..." : `${stores.length}件の店舗を表示`}
          {failed > 0 && `（位置不明 ${failed}件）`}
        </p>
      </header>
      {error ? (
        <p className="p-6 text-center text-red-700">{error}</p>
      ) : (
        <main className="min-h-0 flex-1">
          <StoreMap stores={stores} focus={focus} />
        </main>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <MapContent />
    </Suspense>
  );
}
