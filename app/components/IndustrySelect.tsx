"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Industry = { id: number; name: string; description: string | null };

type Props = {
  value: string;
  onChange: (value: string) => void;
  industries: Industry[];
  ariaLabel: string;
  triggerClassName: string;
  id?: string;
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
};

export default function IndustrySelect({
  value,
  onChange,
  industries,
  ariaLabel,
  triggerClassName,
  id,
  placeholder = "選択してください",
  allLabel,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Industry | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open && !info) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (info) setInfo(null);
      else setOpen(false);
    }

    function handleMouseDown(e: MouseEvent) {
      if (info) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open, info]);

  const selected = industries.find((industry) => String(industry.id) === value);
  const currentLabel = selected?.name ?? (allLabel ?? placeholder);
  const isPlaceholder = !selected && allLabel === undefined;

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open && !disabled}
        aria-label={`${ariaLabel}（現在: ${currentLabel}）`}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${triggerClassName} ${
          isPlaceholder ? "text-[color:var(--muted-foreground)]" : ""
        }`}
      >
        <span className="truncate">{currentLabel}</span>
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </button>

      {open && !disabled && (
        <ul className="absolute left-0 z-30 mt-1 max-h-64 w-full min-w-64 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-white py-1 text-[color:var(--foreground)] shadow-lg">
          {allLabel !== undefined && (
            <li>
              <button
                type="button"
                aria-current={value === "" ? "true" : undefined}
                onClick={() => choose("")}
                className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[color:var(--background)] ${
                  value === "" ? "font-bold text-[color:var(--primary)]" : ""
                }`}
              >
                {allLabel}
              </button>
            </li>
          )}
          {industries.map((industry) => {
            const isSelected = String(industry.id) === value;
            return (
              <li key={industry.id} className="flex items-center">
                <button
                  type="button"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => choose(String(industry.id))}
                  className={`min-w-0 flex-1 px-4 py-2.5 text-left text-sm font-medium hover:bg-[color:var(--background)] ${
                    isSelected ? "font-bold text-[color:var(--primary)]" : ""
                  }`}
                >
                  {industry.name}
                </button>
                {industry.description && (
                  <button
                    type="button"
                    aria-label={`${industry.name}の説明を表示`}
                    onClick={() => setInfo(industry)}
                    className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] text-xs font-bold text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--background)]"
                  >
                    ?
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {info && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setInfo(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-[color:var(--foreground)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 id={titleId} className="text-lg font-black">
                {info.name}
              </h4>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setInfo(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--background)] text-sm font-bold transition-colors hover:bg-[color:var(--border)]"
              >
                ✕
              </button>
            </div>
            <p className="mb-1 text-xs font-bold text-[color:var(--muted-foreground)]">
              主な職種・店舗の例
            </p>
            <p className="text-sm leading-relaxed">{info.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
