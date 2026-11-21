"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import IndustrySelect, { type Industry } from "./IndustrySelect";
import type { Municipality, Store } from "../types";

type Department = { id: number; name: string };

const NUMBER_OF_PEOPLE_OPTIONS = ["1~3人", "4~6人", "7~9人", "10人以上"];
const RECRUITING_OPTIONS = ["募集中", "募集していない", "不明"];

function normalizeValueForSearch(value: string) {
  return value.replace(/\s/g, "").trim();
}

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

type Props = {
  stores: Store[];
  municipalities: Municipality[];
  industries: Industry[];
  industryLoadError: string | null;
  onClose: () => void;
  onPosted: () => void | Promise<void>;
};

export default function ReviewFormModal({
  stores,
  municipalities,
  industries,
  industryLoadError,
  onClose,
  onPosted,
}: Props) {
  const [storeName, setStoreName] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isStoreInputFocused, setIsStoreInputFocused] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentName, setDepartmentName] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [isDepartmentInputFocused, setIsDepartmentInputFocused] = useState(false);
  const [departmentLoadError, setDepartmentLoadError] = useState<string | null>(null);
  const [municipalityId, setMunicipalityId] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [rating, setRating] = useState(0);
  const [numberOfPeople, setNumberOfPeople] = useState("");
  const [recruiting, setRecruiting] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobGap, setJobGap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  useEffect(() => {
    async function loadDepartments() {
      const { data, error } = await supabase
        .from("department")
        .select("id, name")
        .order("name");

      if (error) {
        setDepartmentLoadError(error.message);
        return;
      }

      setDepartments(
        (data ?? []).map((row) => ({
          id: Number(row.id),
          name: row.name as string,
        })),
      );
    }

    void loadDepartments();
  }, []);

  const normalizedStoreName = storeName.trim();
  const missingRequiredFields = {
    municipality: !municipalityId,
    store: !normalizedStoreName,
    industry: !industryId,
    rating: rating === 0,
    numberOfPeople: !numberOfPeople,
    recruiting: !recruiting,
    jobGap: !jobGap.trim(),
  };
  const normalizedStoreSearchTerm = normalizeValueForSearch(storeName);
  const storesInMunicipality =
    municipalityId === ""
      ? []
      : stores.filter((store) => store.municipalityId === Number(municipalityId));
  const storeSuggestions = storesInMunicipality
    .filter((store) =>
      normalizeValueForSearch(store.name).includes(normalizedStoreSearchTerm),
    )
    .slice(0, 5);
  // 業種は店舗の属性。登録済みの店舗を選んだ場合は店舗側の値を使い、変更させない
  const selectedStore =
    selectedStoreId === null ? undefined : stores.find((store) => store.id === selectedStoreId);
  const isIndustryLocked = selectedStore !== undefined && selectedStore.industryId !== null;
  const normalizedDepartmentName = departmentName.trim();
  const normalizedDepartmentSearchTerm = normalizeValueForSearch(departmentName);
  const departmentSuggestions = departments
    .filter((department) =>
      normalizeValueForSearch(department.name).includes(normalizedDepartmentSearchTerm),
    )
    .slice(0, 5);

  function handleMunicipalityChange(value: string) {
    if (isIndustryLocked) setIndustryId("");
    setMunicipalityId(value);
    setStoreName("");
    setSelectedStoreId(null);
  }

  function handleStoreNameChange(value: string) {
    if (isIndustryLocked) setIndustryId("");
    setStoreName(value);
    setSelectedStoreId(null);
  }

  function selectStore(store: Store) {
    setStoreName(store.name);
    setSelectedStoreId(store.id);
    setIsStoreInputFocused(false);
    if (store.industryId !== null) setIndustryId(String(store.industryId));
  }

  function handleDepartmentNameChange(value: string) {
    setDepartmentName(value);
    setSelectedDepartmentId(null);
  }

  function selectDepartment(department: Department) {
    setDepartmentName(department.name);
    setSelectedDepartmentId(department.id);
    setIsDepartmentInputFocused(false);
  }

  async function handleWriteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShowRequiredErrors(true);
    const firstMissingField = [
      { id: "municipality", missing: missingRequiredFields.municipality },
      { id: "store-name", missing: missingRequiredFields.store },
      { id: "industry", missing: missingRequiredFields.industry },
      { id: "rating-1", missing: missingRequiredFields.rating },
      { id: "number-of-people", missing: missingRequiredFields.numberOfPeople },
      { id: "recruiting", missing: missingRequiredFields.recruiting },
      { id: "job-gap", missing: missingRequiredFields.jobGap },
    ].find(({ missing }) => missing);
    if (firstMissingField) {
      setSubmitError(null);
      requestAnimationFrame(() => document.getElementById(firstMissingField.id)?.focus());
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    let storeId = selectedStoreId;
    let existingStore = selectedStore;
    let departmentId = selectedDepartmentId;

    if (storeId === null) {
      // 店舗名は全体で一意なため、市町村を問わず全店舗から名前で一致を探す
      const matchingStore = stores.find(
        (store) =>
          normalizeValueForSearch(store.name) === normalizedStoreSearchTerm,
      );

      if (matchingStore) {
        storeId = matchingStore.id;
        existingStore = matchingStore;
      } else {
        const { data: createdStore, error: createStoreError } = await supabase
          .from("store")
          .insert({
            name: normalizedStoreName,
            munisipality_id: Number(municipalityId),
            type_of_industry_id: Number(industryId),
          })
          .select("id")
          .maybeSingle();

        if (createStoreError || !createdStore) {
          setSubmitting(false);
          // UNIQUE 制約違反（同名店舗が既に存在）の場合のメッセージ
          const message =
            createStoreError?.code === "23505"
              ? "同じ名前の店舗がすでに登録されています。候補から選択してください。"
              : createStoreError?.message ?? "店舗の登録後にIDを取得できませんでした。";
          setSubmitError(message);
          return;
        }

        storeId = Number(createdStore.id);
      }
    }

    if (normalizedDepartmentName && departmentId === null) {
      const matchingDepartment = departments.find(
        (department) =>
          normalizeValueForSearch(department.name) === normalizedDepartmentSearchTerm,
      );

      if (matchingDepartment) {
        departmentId = matchingDepartment.id;
      } else {
        const { data: createdDepartment, error: createDepartmentError } = await supabase
          .from("department")
          .insert({ name: normalizedDepartmentName })
          .select("id")
          .maybeSingle();

        if (createDepartmentError || !createdDepartment) {
          setSubmitting(false);
          setSubmitError(
            createDepartmentError?.message ?? "部署の登録後にIDを取得できませんでした。",
          );
          return;
        }

        departmentId = Number(createdDepartment.id);
      }
    }

    // 投稿内容に合わせて店舗の求人募集状況を更新（募集中/募集していない/不明）。
    // 既存店舗で業種が未登録の場合のみ、選択した業種も店舗に登録する
    const storeUpdate: { recruiting_status: string; type_of_industry_id?: number } = {
      recruiting_status: recruiting,
    };
    if (existingStore !== undefined && existingStore.industryId === null) {
      storeUpdate.type_of_industry_id = Number(industryId);
    }

    const { error: updateStoreError } = await supabase
      .from("store")
      .update(storeUpdate)
      .eq("id", storeId);

    if (updateStoreError) {
      setSubmitting(false);
      setSubmitError(updateStoreError.message);
      return;
    }

    const { error } = await supabase.from("review").insert({
      store_id: storeId,
      stage_evaluation: rating,
      number_of_people: numberOfPeople,
      job_description: jobDescription || null,
      job_gap: jobGap,
      department_id: departmentId,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    void onPosted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--card)] rounded-3xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleWriteSubmit} className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-xl">口コミを投稿する</h3>
              <p className="mt-1 text-xs font-medium text-[color:var(--muted-foreground)]">
                「必須」の項目を入力してください
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[color:var(--background)] flex items-center justify-center text-sm font-bold hover:bg-[color:var(--border)] transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="municipality"
                className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
              >
                市町村 <RequirementBadge required />
              </label>
              <select
                id="municipality"
                aria-invalid={showRequiredErrors && missingRequiredFields.municipality}
                aria-describedby={showRequiredErrors && missingRequiredFields.municipality ? "municipality-error" : undefined}
                value={municipalityId}
                onChange={(e) => handleMunicipalityChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500 transition-colors bg-[color:var(--background)]"
              >
                <option value="" disabled>
                  先に市町村を選択してください
                </option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {showRequiredErrors && missingRequiredFields.municipality && (
                <p id="municipality-error" className="mt-1 text-xs font-medium text-red-600">
                  市町村を選択してください
                </p>
              )}
            </div>
            <div className="relative">
              <label
                htmlFor="store-name"
                className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
              >
                店舗名 <RequirementBadge required />
              </label>
              <input
                id="store-name"
                type="text"
                aria-invalid={showRequiredErrors && missingRequiredFields.store}
                aria-describedby={showRequiredErrors && missingRequiredFields.store ? "store-name-error" : undefined}
                placeholder={
                  municipalityId === ""
                    ? "先に市町村を選択してください"
                    : "例: サンエー那覇メインプレイス"
                }
                value={storeName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                onFocus={() => setIsStoreInputFocused(true)}
                onBlur={() => setIsStoreInputFocused(false)}
                disabled={municipalityId === ""}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500 transition-colors bg-[color:var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
              />
              {showRequiredErrors && missingRequiredFields.store && (
                <p id="store-name-error" className="mt-1 text-xs font-medium text-red-600">
                  店舗名を入力してください
                </p>
              )}
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
              ) : municipalityId !== "" ? (
                <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                  選択した市町村内の店舗から候補を表示します。
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="industry"
                className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
              >
                業種 <RequirementBadge required />
              </label>
              <IndustrySelect
                id="industry"
                value={industryId}
                onChange={setIndustryId}
                industries={industries}
                placeholder="選択してください"
                ariaLabel="業種"
                disabled={isIndustryLocked}
                triggerClassName="px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
              />
              {showRequiredErrors && missingRequiredFields.industry && !isIndustryLocked && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  業種を選択してください
                </p>
              )}
              {isIndustryLocked ? (
                <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                  この店舗の業種はすでに登録されています。
                </p>
              ) : selectedStore !== undefined ? (
                <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                  この店舗の業種は未登録です。選択すると店舗に登録されます。
                </p>
              ) : null}
              {industryLoadError && (
                <p className="mt-2 text-xs text-red-600">業種の取得に失敗しました: {industryLoadError}</p>
              )}
            </div>
            <div className="relative">
              <label
                htmlFor="department-name"
                className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]"
              >
                部署 <RequirementBadge required={false} />
              </label>
              <input
                id="department-name"
                type="text"
                placeholder="例: キッチン、ホール"
                value={departmentName}
                onChange={(e) => handleDepartmentNameChange(e.target.value)}
                onFocus={() => setIsDepartmentInputFocused(true)}
                onBlur={() => setIsDepartmentInputFocused(false)}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
              />
              {isDepartmentInputFocused && normalizedDepartmentName && departmentSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-white shadow-lg">
                  {departmentSuggestions.map((department) => (
                    <li key={department.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectDepartment(department)}
                        className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-[color:var(--background)]"
                      >
                        {department.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedDepartmentId !== null ? (
                <p className="mt-2 text-xs text-emerald-700">部署を選択済みです。</p>
              ) : normalizedDepartmentName ? (
                <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                  候補にない場合は、新しい部署として登録されます。
                </p>
              ) : null}
              {departmentLoadError && (
                <p className="mt-2 text-xs text-red-600">部署候補の取得に失敗しました: {departmentLoadError}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">
                総合評価 <RequirementBadge required />
              </p>
              <div className="flex gap-2" role="group" aria-label="総合評価">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    id={s === 1 ? "rating-1" : undefined}
                    type="button"
                    aria-label={`${s}つ星`}
                    aria-pressed={rating === s}
                    aria-describedby={s === 1 && showRequiredErrors && missingRequiredFields.rating ? "rating-error" : undefined}
                    onClick={() => setRating(s)}
                    className="text-2xl transition-colors"
                    style={{ color: s <= rating ? "#ffce00" : "var(--border)" }}
                  >
                    ★
                  </button>
                ))}
              </div>
              {showRequiredErrors && missingRequiredFields.rating && (
                <p id="rating-error" className="mt-1 text-xs font-medium text-red-600">
                  総合評価を選択してください
                </p>
              )}
            </div>
            <div>
              <label htmlFor="number-of-people" className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]">
                大学生バイトの人数 <RequirementBadge required />
              </label>
              <select
                id="number-of-people"
                aria-invalid={showRequiredErrors && missingRequiredFields.numberOfPeople}
                aria-describedby={showRequiredErrors && missingRequiredFields.numberOfPeople ? "number-of-people-error" : undefined}
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500 transition-colors bg-[color:var(--background)]"
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
              {showRequiredErrors && missingRequiredFields.numberOfPeople && (
                <p id="number-of-people-error" className="mt-1 text-xs font-medium text-red-600">
                  大学生バイトの人数を選択してください
                </p>
              )}
            </div>
            <div>
              <label htmlFor="recruiting" className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]">
                求人募集状況 <RequirementBadge required />
              </label>
              <select
                id="recruiting"
                aria-invalid={showRequiredErrors && missingRequiredFields.recruiting}
                aria-describedby={showRequiredErrors && missingRequiredFields.recruiting ? "recruiting-error" : undefined}
                value={recruiting}
                onChange={(e) => setRecruiting(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500 transition-colors bg-[color:var(--background)]"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {RECRUITING_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {showRequiredErrors && missingRequiredFields.recruiting && (
                <p id="recruiting-error" className="mt-1 text-xs font-medium text-red-600">
                  求人募集状況を選択してください
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">
                業務内容 <RequirementBadge required={false} />
              </p>
              <textarea
                rows={3}
                placeholder="実際に担当した業務内容を教えてください"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)] resize-none"
              />
            </div>
            <div>
              <label htmlFor="job-gap" className="mb-2 block text-xs font-bold text-[color:var(--muted-foreground)]">
                求人情報とのギャップ <RequirementBadge required />
              </label>
              <textarea
                id="job-gap"
                aria-invalid={showRequiredErrors && missingRequiredFields.jobGap}
                aria-describedby={showRequiredErrors && missingRequiredFields.jobGap ? "job-gap-error" : undefined}
                rows={3}
                placeholder="求人サイトの情報と実際の業務で感じた違いを教えてください"
                value={jobGap}
                onChange={(e) => setJobGap(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500 transition-colors bg-[color:var(--background)] resize-none"
              />
              {showRequiredErrors && missingRequiredFields.jobGap && (
                <p id="job-gap-error" className="mt-1 text-xs font-medium text-red-600">
                  求人情報とのギャップを入力してください
                </p>
              )}
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
  );
}
