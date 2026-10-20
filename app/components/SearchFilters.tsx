"use client";

import type { FormEvent, ReactNode } from "react";
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

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`${CONTROL_CLASS} appearance-none pr-10`}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[color:var(--foreground)]"
      >
        ▾
      </span>
    </div>
  );
}

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
          <FilterSelect
            value={filterMunicipalityId}
            onChange={onMunicipalityChange}
            ariaLabel="市町村で絞り込み"
          >
            <option value="">すべての市町村</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </FilterSelect>
          <IndustrySelect
            value={filterIndustryId}
            onChange={onIndustryChange}
            industries={industries}
            allLabel="すべての業種"
            ariaLabel="業種で絞り込み"
            triggerClassName={CONTROL_CLASS}
          />
          <FilterSelect
            value={filterRecruiting}
            onChange={onRecruitingChange}
            ariaLabel="募集状況で絞り込み"
          >
            <option value="">すべての募集状況</option>
            <option value="true">募集中のみ</option>
            <option value="false">募集なし・不明</option>
          </FilterSelect>
        </div>
      </div>
    </section>
  );
}
