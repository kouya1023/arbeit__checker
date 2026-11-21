"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "./theme";
import type { Industry } from "./components/IndustrySelect";
import ReviewFormModal from "./components/ReviewFormModal";
import SearchFilters from "./components/SearchFilters";
import StarRating from "./components/StarRating";
import type { Municipality, Store } from "./types";

async function loadStoreRows(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("store")
    .select(
      "id, name, munisipality_id, type_of_industry_id, average, review_count, recruiting_status",
    );

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    name: row.name as string,
    reviewCount: Number(row.review_count) || 0,
    averageRating: Number(row.review_count) === 0 ? null : Number(row.average),
    municipalityId:
      row.munisipality_id !== null && row.munisipality_id !== undefined
        ? Number(row.munisipality_id)
        : null,
    industryId:
      row.type_of_industry_id !== null && row.type_of_industry_id !== undefined
        ? Number(row.type_of_industry_id)
        : null,
    recruitingStatus:
      row.recruiting_status === null || row.recruiting_status === undefined
        ? null
        : (row.recruiting_status as string).trim() || null,
  }));
}

function HomeContent() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [search, setSearch] = useState("");
  // 地図ページから戻ってきたとき、その絞り込みを引き継ぐ
  const [filterMunicipalityId, setFilterMunicipalityId] = useState(
    useSearchParams().get("municipality") ?? "",
  );
  const [filterIndustryId, setFilterIndustryId] = useState("");
  const [filterRecruiting, setFilterRecruiting] = useState("");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryLoadError, setIndustryLoadError] = useState<string | null>(null);

  useEffect(() => {
    void loadStoreRows()
      .then((rows) => {
        setStores(rows);
        setError(null);
      })
      .catch((error: Error) => setError(error.message))
      .finally(() => setLoading(false));

    async function loadMunicipalities() {
      const { data } = await supabase
        .from("municipality")
        .select("id, name")
        .order("id");

      setMunicipalities(
        (data ?? []).map((row) => ({
          id: Number(row.id),
          name: row.name as string,
        })),
      );
    }

    async function loadIndustries() {
      const { data, error } = await supabase
        .from("type_of_industry")
        .select("id, name, description")
        .order("id");

      if (error) {
        setIndustryLoadError(error.message);
        return;
      }

      setIndustries(
        (data ?? []).map((row) => ({
          id: Number(row.id),
          name: row.name as string,
          description: (row.description as string | null) ?? null,
        })),
      );
    }

    void loadMunicipalities();
    void loadIndustries();
  }, []);

  const filtered = stores
    .filter((s) => {
      const matchesSearch = search === "" || s.name.includes(search);
      const matchesMunicipality =
        filterMunicipalityId === "" ||
        s.municipalityId === Number(filterMunicipalityId);
      const matchesIndustry =
        filterIndustryId === "" || s.industryId === Number(filterIndustryId);
      const matchesRecruiting =
        filterRecruiting === "" || s.recruitingStatus === filterRecruiting;
      return matchesSearch && matchesMunicipality && matchesIndustry && matchesRecruiting;
    })
    // 募集中の店舗を上位に表示（それ以外は元の並び順を維持）
    .sort((a, b) => {
      const aTop = a.recruitingStatus === "募集中" ? 0 : 1;
      const bTop = b.recruitingStatus === "募集中" ? 0 : 1;
      return aTop - bTop;
    });

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  async function handlePosted() {
    setShowWriteForm(false);
    setLoading(true);
    try {
      setStores(await loadStoreRows());
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "店舗一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div
      className={`min-h-screen flex-1 bg-[color:var(--background)] text-[color:var(--foreground)] ${outfit.className}`}
      style={THEME}
    >
      <div className="bg-[color:var(--secondary)]">
        {/* Header */}
        <header className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Image
            src="/logo/Arbeit_checker_logo.png"
            alt="バイトチェッカー"
            width={64}
            height={64}
            priority
            className="shrink-0"
          />
          <div className="flex items-center gap-2">
            <Link
              href={filterMunicipalityId ? `/map?municipality=${filterMunicipalityId}` : "/map"}
              className="border border-white/30 text-white text-sm font-bold px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              マップから店を探す
            </Link>
            <button
              onClick={() => setShowWriteForm(true)}
              className="bg-[color:var(--primary)] text-white text-sm font-bold px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            >
              口コミを書く
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="border border-white/30 text-white text-sm font-bold px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              {loggingOut ? "ログアウト中..." : "ログアウト"}
            </button>
          </div>
        </header>

        {/* Search */}
        <SearchFilters
          search={search}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          municipalities={municipalities}
          filterMunicipalityId={filterMunicipalityId}
          onMunicipalityChange={setFilterMunicipalityId}
          industries={industries}
          filterIndustryId={filterIndustryId}
          onIndustryChange={setFilterIndustryId}
          filterRecruiting={filterRecruiting}
          onRecruitingChange={setFilterRecruiting}
        />
      </div>

      {/* Store Cards */}
      <section className="max-w-6xl mx-auto px-5 py-10">
        <p className="text-sm text-[color:var(--muted-foreground)] mb-5">
          {loading ? "読み込み中..." : `${filtered.length}件の店舗`}
        </p>

        {loading ? (
          <div className="text-center py-16 text-[color:var(--muted-foreground)]">
            <p className="font-semibold">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-[color:var(--muted-foreground)]">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="font-semibold">データの取得に失敗しました</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[color:var(--muted-foreground)]">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">該当する店舗が見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/store/${s.id}`}
                className="block bg-[color:var(--card)] rounded-2xl p-5 border border-[color:var(--border)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-bold text-lg">{s.name}</p>
                  {s.recruitingStatus === "募集中" ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      募集中
                    </span>
                  ) : s.recruitingStatus === "募集していない" ? (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                      募集していない
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[color:var(--background)] px-2 py-0.5 text-xs font-bold text-[color:var(--muted-foreground)]">
                      {s.recruitingStatus === "不明" ? "不明" : "情報なし"}
                    </span>
                  )}
                </div>
                {s.averageRating === null ? (
                  <p className="text-sm font-bold text-[color:var(--muted-foreground)]">
                    評価なし
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <StarRating value={s.averageRating} />
                    <span className="text-sm font-bold text-[color:var(--muted-foreground)]">
                      {s.averageRating.toFixed(1)}（{s.reviewCount}件）
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Write Form Modal */}
      {showWriteForm && (
        <ReviewFormModal
          stores={stores}
          municipalities={municipalities}
          industries={industries}
          industryLoadError={industryLoadError}
          onClose={() => setShowWriteForm(false)}
          onPosted={handlePosted}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
