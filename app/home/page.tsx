"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "../theme";

type Company = { name: string; rating: number };
type StoreOption = { id: number; name: string };

function StarRating({ value }: { value: number }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span className="inline-flex gap-0.5">
      {stars.map((s) => (
        <span key={s} className="text-sm" style={{ color: s <= Math.round(value) ? "#ffce00" : "#e2e8f0" }}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isStoreInputFocused, setIsStoreInputFocused] = useState(false);
  const [storeLoadError, setStoreLoadError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function fetchReviews() {
    const { data, error } = await supabase
      .from("review")
      .select("store_name, stage_evaluation");

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []).map((row) => ({
      name: row.store_name as string,
      rating: Number(row.stage_evaluation) || 0,
    }));
    setCompanies(rows);
    setLoading(false);
  }

  useEffect(() => {
    async function loadInitialData() {
      const [reviewsResponse, storesResponse] = await Promise.all([
        supabase.from("review").select("store_name, stage_evaluation"),
        supabase.from("store").select("id, name").order("name"),
      ]);

      if (reviewsResponse.error) {
        setError(reviewsResponse.error.message);
      } else {
        setCompanies(
          (reviewsResponse.data ?? []).map((row) => ({
            name: row.store_name as string,
            rating: Number(row.stage_evaluation) || 0,
          })),
        );
      }
      setLoading(false);

      if (storesResponse.error) {
        setStoreLoadError(storesResponse.error.message);
      } else {
        setStoreOptions(
          (storesResponse.data ?? []).map((row) => ({
            id: Number(row.id),
            name: row.name as string,
          })),
        );
      }
    }

    void loadInitialData();
  }, []);

  const filtered = companies.filter((c) => search === "" || c.name.includes(search));
  const normalizedStoreName = storeName.trim();
  const storeSuggestions = storeOptions
    .filter((store) => store.name.includes(normalizedStoreName))
    .slice(0, 5);

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  function closeWriteForm() {
    setShowWriteForm(false);
    setStoreName("");
    setSelectedStoreId(null);
    setIsStoreInputFocused(false);
    setRating(0);
    setSubmitError(null);
  }

  function handleStoreNameChange(value: string) {
    setStoreName(value);
    setSelectedStoreId(null);
  }

  function selectStore(store: StoreOption) {
    setStoreName(store.name);
    setSelectedStoreId(store.id);
    setIsStoreInputFocused(false);
  }

  async function handleWriteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!normalizedStoreName || rating === 0) {
      setSubmitError("企業名と評価を入力してください。");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    let storeId = selectedStoreId;

    if (storeId === null) {
      const { data: createdStore, error: createStoreError } = await supabase
        .from("store")
        .insert({ name: normalizedStoreName })
        .select("id")
        .single();

      if (createStoreError) {
        if (createStoreError.code === "23505") {
          const { data: existingStore, error: findStoreError } = await supabase
            .from("store")
            .select("id")
            .eq("name", normalizedStoreName)
            .single();

          if (findStoreError || !existingStore) {
            setSubmitting(false);
            setSubmitError(findStoreError?.message ?? createStoreError.message);
            return;
          }

          storeId = Number(existingStore.id);
        } else {
          setSubmitting(false);
          setSubmitError(createStoreError.message);
          return;
        }
      } else {
        storeId = Number(createdStore.id);
      }
    }

    const { error } = await supabase.from("review").insert({
      store_id: storeId,
      store_name: normalizedStoreName,
      stage_evaluation: rating,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    closeWriteForm();
    fetchReviews();
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
            className="shrink-0"
          />
          <button
            onClick={() => setShowWriteForm(true)}
            className="bg-[color:var(--primary)] text-white text-sm font-bold px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            口コミを書く
          </button>
        </header>

        {/* Search */}
        <section className="pb-10">
          <div className="max-w-6xl mx-auto px-5">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 bg-white rounded-2xl p-2 shadow-lg max-w-xl">
              <input
                type="text"
                placeholder="企業名・職種で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 text-[color:var(--foreground)] text-sm font-medium outline-none bg-transparent placeholder:text-[color:var(--muted-foreground)]"
              />
              <button
                type="submit"
                className="bg-[color:var(--primary)] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity shrink-0"
              >
                検索
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Review Cards */}
      <section className="max-w-6xl mx-auto px-5 py-10">
        <p className="text-sm text-[color:var(--muted-foreground)] mb-5">
          {loading ? "読み込み中..." : `${filtered.length}件の口コミ`}
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
            <p className="font-semibold">該当する口コミが見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((c) => (
              <div
                key={c.name}
                className="bg-[color:var(--card)] rounded-2xl p-5 border border-[color:var(--border)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              >
                <p className="font-bold text-lg mb-2">{c.name}</p>
                <div className="flex items-center gap-2">
                  <StarRating value={c.rating} />
                  <span className="text-sm font-bold text-[color:var(--muted-foreground)]">{c.rating}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Write Form Modal */}
      {showWriteForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeWriteForm}
        >
          <div
            className="bg-[color:var(--card)] rounded-3xl w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleWriteSubmit} className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-xl">口コミを投稿する</h3>
                <button
                  type="button"
                  onClick={closeWriteForm}
                  className="w-8 h-8 rounded-full bg-[color:var(--background)] flex items-center justify-center text-sm font-bold hover:bg-[color:var(--border)] transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <label
                    htmlFor="store-name"
                    className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
                  >
                    店舗名 *
                  </label>
                  <input
                    id="store-name"
                    type="text"
                    placeholder="例: サンエー那覇メインプレイス"
                    value={storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    onFocus={() => setIsStoreInputFocused(true)}
                    onBlur={() => setIsStoreInputFocused(false)}
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                  />
                  {isStoreInputFocused && normalizedStoreName && storeSuggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-white shadow-lg">
                      {storeSuggestions.map((store) => (
                        <li key={store.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectStore(store)}
                            className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-[color:var(--background)]"
                          >
                            {store.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedStoreId !== null ? (
                    <p className="mt-2 text-xs text-emerald-700">既存の店舗を選択済みです。</p>
                  ) : normalizedStoreName ? (
                    <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                      候補にない場合は、新しい店舗として登録されます。
                    </p>
                  ) : null}
                  {storeLoadError && (
                    <p className="mt-2 text-xs text-red-600">店舗候補の取得に失敗しました: {storeLoadError}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">総合評価</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="text-2xl transition-colors"
                        style={{ color: s <= rating ? "#ffce00" : "var(--border)" }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[color:var(--primary)] text-white font-black py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {submitting ? "投稿中..." : "投稿する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
