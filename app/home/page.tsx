"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "../theme";

type Store = { id: number; name: string; reviewCount: number };
type Municipality = { id: number; name: string };

const NUMBER_OF_PEOPLE_OPTIONS = ["1~3人", "4~6人", "7~9人", "10人以上"];

function normalizeStoreNameForSearch(value: string) {
  return value.replace(/\s/g, "").trim();
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

  const [storeName, setStoreName] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isStoreInputFocused, setIsStoreInputFocused] = useState(false);
  const [municipalityId, setMunicipalityId] = useState("");
  const [rating, setRating] = useState(0);
  const [numberOfPeople, setNumberOfPeople] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobGap, setJobGap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function fetchStores() {
    setLoading(true);

    const [storeResult, reviewResult] = await Promise.all([
      supabase.from("store").select("id, name"),
      supabase.from("review").select("store_id"),
    ]);

    if (storeResult.error) {
      setError(storeResult.error.message);
      setLoading(false);
      return;
    }

    const countByStoreId = new Map<number, number>();
    for (const row of reviewResult.data ?? []) {
      const id = Number(row.store_id);
      countByStoreId.set(id, (countByStoreId.get(id) ?? 0) + 1);
    }

    const rows = (storeResult.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name as string,
      reviewCount: countByStoreId.get(Number(row.id)) ?? 0,
    }));
    setStores(rows);
    setLoading(false);
  }

  useEffect(() => {
    fetchStores();
    async function loadInitialStores() {
      const { data, error } = await supabase.from("store").select("id, name");

      if (error) {
        setError(error.message);
      } else {
        setStores(
          (data ?? []).map((row) => ({
            id: Number(row.id),
            name: row.name as string,
            average: 0,
          })),
        );
      }
      setLoading(false);
    }

    async function loadMunicipalities() {
      const { data } = await supabase
        .from("municipality")
        .select("id, munisipality")
        .order("id");

      setMunicipalities(
        (data ?? []).map((row) => ({
          id: Number(row.id),
          name: row.munisipality as string,
        })),
      );
    }

    void loadInitialStores();
    void loadMunicipalities();
  }, []);

  const filtered = stores.filter((s) => search === "" || s.name.includes(search));
  const normalizedStoreName = storeName.trim();
  const normalizedStoreSearchTerm = normalizeStoreNameForSearch(storeName);
  const storeSuggestions = stores
    .filter((store) =>
      normalizeStoreNameForSearch(store.name).includes(normalizedStoreSearchTerm),
    )
    .slice(0, 5);

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  function closeWriteForm() {
    setShowWriteForm(false);
    setStoreName("");
    setSelectedStoreId(null);
    setIsStoreInputFocused(false);
    setMunicipalityId("");
    setRating(0);
    setNumberOfPeople("");
    setJobDescription("");
    setJobGap("");
    setSubmitError(null);
  }

  function handleStoreNameChange(value: string) {
    setStoreName(value);
    setSelectedStoreId(null);
  }

  function selectStore(store: Store) {
    setStoreName(store.name);
    setSelectedStoreId(store.id);
    setIsStoreInputFocused(false);
  }

  async function handleWriteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!normalizedStoreName || rating === 0 || !numberOfPeople || !jobDescription) {
      setSubmitError("企業名・総合評価・人数・求人情報とのギャップを入力してください。");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    let storeId = selectedStoreId;
    let storeNameForReview = normalizedStoreName;

    if (storeId === null) {
      const matchingStore = stores.find(
        (store) =>
          normalizeStoreNameForSearch(store.name) === normalizedStoreSearchTerm,
      );

      if (matchingStore) {
        storeId = matchingStore.id;
        storeNameForReview = matchingStore.name;
      } else {
        const { data: createdStore, error: createStoreError } = await supabase
          .from("store")
          .insert({ name: normalizedStoreName })
          .select("id")
          .maybeSingle();

        if (createStoreError || !createdStore) {
          setSubmitting(false);
          setSubmitError(createStoreError?.message ?? "店舗の登録後にIDを取得できませんでした。");
          return;
        }

        storeId = Number(createdStore.id);
      }
    }

    const { error } = await supabase.from("review").insert({
      store_id: storeId,
      store_name: storeNameForReview,
      munisipality_id: Number(municipalityId),
      stage_evaluation: rating,
      number_of_people: numberOfPeople,
      job_description: jobDescription || null,
      job_gap: jobGap,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    closeWriteForm();
    fetchStores();
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
                placeholder="店舗名で検索..."
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
                href={`/home/${s.id}`}
                className="block bg-[color:var(--card)] rounded-2xl p-5 border border-[color:var(--border)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              >
                <p className="font-bold text-lg mb-2">{s.name}</p>
                <p className="text-sm font-bold text-[color:var(--muted-foreground)]">
                  {s.reviewCount}件の口コミ
                </p>
              </Link>
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
                </div>
                <div>
                  <label
                    htmlFor="municipality"
                    className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
                  >
                    市町村 *
                  </label>
                  <select
                    id="municipality"
                    value={municipalityId}
                    onChange={(e) => setMunicipalityId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                  >
                    <option value="" disabled>
                      選択してください
                    </option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
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
                <div>
                  <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">大学生バイトの人数</p>
                  <select
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                  >
                    <option value="" disabled>
                      選択してください
                    </option>
                    {NUMBER_OF_PEOPLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={3}
                  placeholder="業務内容（任意）"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)] resize-none"
                />
                <div>
                  <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">求人情報とのギャップ *</p>
                  <textarea
                    rows={3}
                    placeholder="求人サイトの情報と実際の業務で感じた違いを教えてください"
                    value={jobGap}
                    onChange={(e) => setJobGap(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)] resize-none"
                  />
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
