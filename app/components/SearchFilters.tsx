"use client";

import type { FormEvent } from "react";
import DropdownSelect from "./DropdownSelect";
import IndustrySelect, { type Industry } from "./IndustrySelect";

type Municipality = { id: number; name: string };

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: FormEvent<HTMLFormElement>) => void;
  municipalities: Municipality[];
  filterMunicipalityId: string;
  onMunicipalityChange: (value: string) => void;
  industries: Industry[];
  filterIndustryId: string;
  onIndustryChange: (value: string) => void;
  filterRecruiting: string;
  onRecruitingChange: (value: string) => void;
};

const CONTROL_CLASS =
  "h-12 w-full rounded-2xl bg-white px-4 text-sm font-bold text-[color:var(--foreground)] shadow-lg outline-none";

const RECRUITING_FILTER_OPTIONS = [
  { value: "true", label: "募集中のみ" },
  { value: "false", label: "募集なし・不明" },
];

export default function SearchFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  municipalities,
  filterMunicipalityId,
  onMunicipalityChange,
  industries,
  filterIndustryId,
  onIndustryChange,
  filterRecruiting,
  onRecruitingChange,
}: Props) {
  return (
    <section className="pb-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-5">
        <form
          onSubmit={onSearchSubmit}
          className="flex min-w-0 gap-2 rounded-2xl bg-white p-2 shadow-lg"
        >
          <input
            type="text"
            placeholder="店舗名で検索..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[color:var(--primary)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            検索
          </button>
        </form>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <DropdownSelect
            value={filterMunicipalityId}
            onChange={onMunicipalityChange}
            options={municipalities.map((m) => ({ value: String(m.id), label: m.name }))}
            allLabel="すべての市町村"
            ariaLabel="市町村で絞り込み"
            triggerClassName={CONTROL_CLASS}
          />
          <IndustrySelect
            value={filterIndustryId}
            onChange={onIndustryChange}
            industries={industries}
            allLabel="すべての業種"
            ariaLabel="業種で絞り込み"
            triggerClassName={CONTROL_CLASS}
          />
          <DropdownSelect
            value={filterRecruiting}
            onChange={onRecruitingChange}
            options={RECRUITING_FILTER_OPTIONS}
            allLabel="すべての募集状況"
            ariaLabel="募集状況で絞り込み"
            triggerClassName={CONTROL_CLASS}
          />
        </div>
      </div>
    </section>
  );
}
