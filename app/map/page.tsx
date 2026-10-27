"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { geocodeAddresses } from "@/lib/geocode";
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
  const { data: reviews, error } = await supabase
    .from("review")
    .select("store_id, adress")
    .not("adress", "is", null);
  if (error) throw error;

  // 店舗ごとに最初に見つかった住所を使う
  const addressByStore = new Map<number, string>();
  for (const r of reviews ?? []) {
    const address = ((r.adress as string | null) ?? "").trim();
    const storeId = Number(r.store_id);
    if (address && !addressByStore.has(storeId)) addressByStore.set(storeId, address);
  }

  const { data: storeRows, error: storeError } = await supabase
    .from("store")
    .select("id, name")
    .in("id", [...addressByStore.keys()]);
  if (storeError) throw storeError;

  const points = await geocodeAddresses([...addressByStore.values()]);

  const stores: MapStore[] = [];
  let failed = 0;
  for (const row of storeRows ?? []) {
    const address = addressByStore.get(Number(row.id));
    const point = address ? points.get(address) : undefined;
    if (address && point) {
      stores.push({ id: Number(row.id), name: row.name as string, address, ...point });
    } else {
      failed++;
    }
  }
  return { stores, failed };
}

export default function MapPage() {
  const [stores, setStores] = useState<MapStore[]>([]);
  const [failed, setFailed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMapStores()
      .then((result) => {
        setStores(result.stores);
        setFailed(result.failed);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "店舗情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className={`flex h-dvh flex-col bg-[color:var(--background)] ${outfit.className}`}
      style={THEME}
    >
      <header className="flex items-center justify-between gap-3 bg-[color:var(--secondary)] px-5 py-3 text-white">
        <Link href="/" className="text-sm font-bold hover:underline">
          ← 店舗一覧に戻る
        </Link>
        <p className="text-sm font-bold">
          {loading ? "住所を検索中..." : `${stores.length}件の店舗を表示`}
          {failed > 0 && `（位置不明 ${failed}件）`}
        </p>
      </header>
      {error ? (
        <p className="p-6 text-center text-red-700">{error}</p>
      ) : (
        <main className="min-h-0 flex-1">
          <StoreMap stores={stores} />
        </main>
      )}
    </div>
  );
}
