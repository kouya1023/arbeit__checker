"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type SubmitEvent } from "react";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "./theme";
import IndustrySelect, { type Industry } from "./components/IndustrySelect";
import ReviewFormModal from "./components/ReviewFormModal";
import SearchFilters from "./components/SearchFilters";
import StarRating from "./components/StarRating";
import type { Municipality, Store } from "./types";

function RequirementBadge({ required }: { required: boolean }) {
  return (
    <span
      className={
        required
          ? "ml-1 inline-flex rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-red-700"
          : "ml-1 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600"
      }
    >
      {required ? "必須" : "任意"}
    </span>
  );
}

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

  // プロフィール（バイト探し状況）。ゲストは対象外
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [jobHunting, setJobHunting] = useState(false);
  const [preferredMunicipalityId, setPreferredMunicipalityId] = useState("");
  const [preferredIndustryId, setPreferredIndustryId] = useState("");
  const [jobHuntingCount, setJobHuntingCount] = useState<number | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileDraft, setProfileDraft] = useState(false);
  const [profileDraftMunicipalityId, setProfileDraftMunicipalityId] = useState("");
  const [profileDraftIndustryId, setProfileDraftIndustryId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  // アルバイト経験（エリア＋業種）。1人に複数
  type Experience = { municipalityId: string; industryId: string };
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [experienceDrafts, setExperienceDrafts] = useState<Experience[]>([]);
  // 自分の経験に一致する求職者がいるエリア／職種（マッチバナー用）
  const [matchAreaIds, setMatchAreaIds] = useState<number[]>([]);
  const [matchIndustryIds, setMatchIndustryIds] = useState<number[]>([]);
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

  // ログインユーザーの判定と、自分のバイト探し状況・探している人数の取得
  useEffect(() => {
    async function loadUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const guest = user.is_anonymous === true;
      setCurrentUserId(user.id);
      setIsGuest(guest);
      if (guest) return;

      const { data } = await supabase
        .from("profile")
        .select("is_job_hunting, preferred_municipality_id, preferred_industry_id, experiences")
        .eq("id", user.id)
        .maybeSingle();
      setJobHunting(Boolean(data?.is_job_hunting));
      setPreferredMunicipalityId(
        data?.preferred_municipality_id != null ? String(data.preferred_municipality_id) : "",
      );
      setPreferredIndustryId(
        data?.preferred_industry_id != null ? String(data.preferred_industry_id) : "",
      );

      // アルバイト経験（profile.experiences = JSONB 配列）
      const rawExperiences = Array.isArray(data?.experiences)
        ? (data.experiences as { municipality_id: number | null; industry_id: number | null }[])
        : [];
      setExperiences(
        rawExperiences.map((row) => ({
          municipalityId: row.municipality_id != null ? String(row.municipality_id) : "",
          industryId: row.industry_id != null ? String(row.industry_id) : "",
        })),
      );

      // 自分の経験に一致する求職者（エリア／職種）を取得
      await loadMatchingSeekers();
    }
    void refreshJobHuntingStats();
    void loadUserProfile();
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

  // 自分の経験に一致する求職者がいるエリア／職種の名前（マッチバナー用）
  const matchAreaNames = matchAreaIds
    .map((id) => municipalities.find((m) => m.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const matchIndustryNames = matchIndustryIds
    .map((id) => industries.find((i) => i.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const hasJobSeekerMatch =
    !isGuest && (matchAreaNames.length > 0 || matchIndustryNames.length > 0);

  function handleSearchSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  // 探している人数（合計）を取り直す
  async function refreshJobHuntingStats() {
    const { data, error } = await supabase.rpc("count_job_hunting");
    if (!error && typeof data === "number") setJobHuntingCount(data);
  }

  // 自分の経験に一致する求職者がいるエリア／職種を取得（OR条件）
  async function loadMatchingSeekers() {
    const { data, error } = await supabase.rpc("matching_job_seekers");
    if (error || !Array.isArray(data)) {
      setMatchAreaIds([]);
      setMatchIndustryIds([]);
      return;
    }
    const areas = new Set<number>();
    const industries = new Set<number>();
    for (const row of data) {
      if (row.area_match && row.municipality_id != null) areas.add(Number(row.municipality_id));
      if (row.industry_match && row.industry_id != null) industries.add(Number(row.industry_id));
    }
    setMatchAreaIds([...areas]);
    setMatchIndustryIds([...industries]);
  }

  function openProfileForm() {
    setProfileDraft(jobHunting);
    setProfileDraftMunicipalityId(preferredMunicipalityId);
    setProfileDraftIndustryId(preferredIndustryId);
    setExperienceDrafts(experiences.map((e) => ({ ...e })));
    setProfileError(null);
    setShowProfileForm(true);
  }

  async function handleSaveProfile() {
    if (!currentUserId || isGuest) return;
    setSavingProfile(true);
    setProfileError(null);

    // アルバイト経験は profile.experiences（JSONB）に一緒に保存する
    const validExperiences = experienceDrafts.filter((e) => e.municipalityId || e.industryId);

    const { error } = await supabase.from("profile").upsert({
      id: currentUserId,
      is_job_hunting: profileDraft,
      preferred_municipality_id: profileDraftMunicipalityId
        ? Number(profileDraftMunicipalityId)
        : null,
      preferred_industry_id: profileDraftIndustryId ? Number(profileDraftIndustryId) : null,
      experiences: validExperiences.map((e) => ({
        municipality_id: e.municipalityId ? Number(e.municipalityId) : null,
        industry_id: e.industryId ? Number(e.industryId) : null,
      })),
      job_hunting_updated_at: new Date().toISOString(),
    });

    setSavingProfile(false);
    if (error) {
      setProfileError(error.message);
      return;
    }

    setJobHunting(profileDraft);
    setPreferredMunicipalityId(profileDraftMunicipalityId);
    setPreferredIndustryId(profileDraftIndustryId);
    setExperiences(validExperiences);
    setShowProfileForm(false);

    // 人数・マッチ状況を取り直す
    await refreshJobHuntingStats();
    await loadMatchingSeekers();
  }

  function addExperienceDraft() {
    setExperienceDrafts((prev) => [...prev, { municipalityId: "", industryId: "" }]);
  }

  function updateExperienceDraft(index: number, patch: Partial<Experience>) {
    setExperienceDrafts((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  function removeExperienceDraft(index: number) {
    setExperienceDrafts((prev) => prev.filter((_, i) => i !== index));
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
        <header className="max-w-6xl mx-auto px-5 py-2 flex items-center justify-between">
          <Image
            src="/logo/Arbeit_checker_logo.png"
            alt="バイトチェッカー"
            width={48}
            height={48}
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
            {!isGuest && (
              <button
                onClick={openProfileForm}
                className="border border-white/30 text-white text-sm font-bold px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                プロフィール
              </button>
            )}
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

      {/* バナー：ヘッダー直下にくっつける（隙間なし）。マッチ時は文章を差し替え */}
      {jobHuntingCount !== null && jobHuntingCount > 0 && (
        <div className="relative overflow-hidden bg-orange-500">
          {/* 効果線っぽい装飾 */}
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
          <div className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-white/15 blur-xl" />
          <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-5 py-2.5">
            <p className="shrink-0 whitespace-nowrap font-black leading-none text-white">
              <span className="align-middle text-sm drop-shadow sm:text-base">現在、琉大生</span>
              <span className="mx-1 align-middle text-2xl text-yellow-200 [text-shadow:_0_3px_0_rgb(159_18_57)] sm:text-3xl">
                {jobHuntingCount}
              </span>
              <span className="align-middle text-base drop-shadow sm:text-lg">人</span>
              <span className="ml-1 align-middle text-sm drop-shadow sm:text-base">
                がアルバイトを探しています！
              </span>
            </p>
            <p className="min-w-0 flex-1 text-sm font-bold text-white drop-shadow sm:text-base wide-full">
              {hasJobSeekerMatch ? (
                <>
                  {matchAreaNames.length > 0 && (
                    <>
                      <span className="text-white">
                        あなたの経験にある
                      </span>
                    
                      <span className="text-yellow-200">  
                        {matchAreaNames.slice(0, 3).join("・")}エリア
                      </span>
                    </>
                  )}
                  {matchAreaNames.length > 0 && matchIndustryNames.length > 0 && "、"}
                  {matchIndustryNames.length > 0 && (
                    <span className="text-yellow-200">
                      {matchIndustryNames.slice(0, 3).join("・")}職種
                    </span>
                  )}
                  で、アルバイトを探している学生がいます！
                  <br />
                </>
              ):(
                <span className="text-white">
                  あなたのアルバイト経験を書いて、バイト探しの手助けをしてみませんか？
                </span>
              )}
              
            </p>
            <button
              onClick={() => setShowWriteForm(true)}
              className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-black text-rose-600 shadow-[0_4px_0_0_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              口コミを書く
            </button>
            </div>
          </div>
      )}

      {/* Store Cards */}
      <section className="max-w-6xl mx-auto px-5 pb-10 pt-6">
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

      {/* Profile Modal（ログインユーザーのみ） */}
      {showProfileForm && !isGuest && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowProfileForm(false)}
        >
          <div
            className="bg-[color:var(--card)] rounded-3xl w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-xl">プロフィール</h3>
                <button
                  type="button"
                  onClick={() => setShowProfileForm(false)}
                  className="w-8 h-8 rounded-full bg-[color:var(--background)] flex items-center justify-center text-sm font-bold hover:bg-[color:var(--border)] transition-colors"
                >
                  ✕
                </button>
              </div>

              <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-[color:var(--border)] p-4">
                <input
                  type="checkbox"
                  checked={profileDraft}
                  onChange={(e) => setProfileDraft(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-[color:var(--primary)]"
                />
                <span>
                  <span className="block text-sm font-bold">アルバイトを探している</span>
                  <span className="mt-1 block text-xs text-[color:var(--muted-foreground)]">
                    オンにすると「◯人が探しています」の人数に加算されます。見つかったらオフにしてください。
                  </span>
                </span>
              </label>

              <div className="mt-4">
                <label
                  htmlFor="preferred-municipality"
                  className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
                >
                  希望勤務地 <RequirementBadge required={false} />
                </label>
                <select
                  id="preferred-municipality"
                  value={profileDraftMunicipalityId}
                  onChange={(e) => setProfileDraftMunicipalityId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                >
                  <option value="">指定しない</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="preferred-industry"
                  className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
                >
                  希望業種 <RequirementBadge required={false} />
                </label>
                <IndustrySelect
                  id="preferred-industry"
                  value={profileDraftIndustryId}
                  onChange={setProfileDraftIndustryId}
                  industries={industries}
                  allLabel="指定しない"
                  ariaLabel="希望業種"
                  triggerClassName="px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                />
              </div>

              <div className="mt-5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-[color:var(--muted-foreground)]">
                    アルバイト経験（複数可）
                  </span>
                  <button
                    type="button"
                    onClick={addExperienceDraft}
                    className="rounded-full bg-[color:var(--background)] px-3 py-1 text-xs font-bold text-[color:var(--primary)] hover:bg-[color:var(--border)] transition-colors"
                  >
                    ＋ 追加
                  </button>
                </div>
                <p className="mb-2 text-xs text-[color:var(--muted-foreground)]">
                  経験したエリア・職種を登録すると、条件が合う求職中の学生がいるときにお知らせします。
                </p>
                {experienceDrafts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[color:var(--border)] px-4 py-3 text-center text-xs text-[color:var(--muted-foreground)]">
                    まだ登録がありません。「＋追加」から経験を登録できます。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {experienceDrafts.map((exp, index) => (
                      <div key={index} className="rounded-xl border border-[color:var(--border)] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-[color:var(--muted-foreground)]">
                            経験 {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExperienceDraft(index)}
                            className="text-xs font-bold text-red-600 hover:underline"
                          >
                            削除
                          </button>
                        </div>
                        <div className="space-y-2">
                          <select
                            value={exp.municipalityId}
                            onChange={(e) =>
                              updateExperienceDraft(index, { municipalityId: e.target.value })
                            }
                            aria-label={`経験${index + 1}のエリア`}
                            className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                          >
                            <option value="">エリアを選択</option>
                            {municipalities.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <IndustrySelect
                            value={exp.industryId}
                            onChange={(value) => updateExperienceDraft(index, { industryId: value })}
                            industries={industries}
                            placeholder="職種を選択"
                            ariaLabel={`経験${index + 1}の職種`}
                            triggerClassName="px-3 py-2 rounded-lg border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {profileError && <p className="mt-3 text-sm text-red-600">{profileError}</p>}

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="mt-5 w-full bg-[color:var(--primary)] text-white font-black py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {savingProfile ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
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
