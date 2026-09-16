"use client";

import Image from "next/image";
import { Outfit } from "next/font/google";
import { useState, type CSSProperties, type FormEvent } from "react";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

const THEME = {
  "--background": "#f5f7fb",
  "--foreground": "#0f2a4a",
  "--card": "#ffffff",
  "--primary": "#2f6fed",
  "--secondary": "#0f2a4a",
  "--accent": "#ffce00",
  "--muted-foreground": "#64748b",
  "--border": "#e2e8f0",
} as CSSProperties;

const COMPANIES = [
  { name: "スターバックス", rating: 4.2 },
  { name: "ユニクロ", rating: 3.9 },
  { name: "ファミリーマート", rating: 3.5 },
  { name: "家庭教師のトライ", rating: 4.5 },
  { name: "マクドナルド", rating: 4.0 },
  { name: "TSUTAYA", rating: 3.3 },
  { name: "すき家", rating: 3.6 },
  { name: "ドミノ・ピザ", rating: 3.8 },
  { name: "ニトリ", rating: 3.7 },
  { name: "塾講師（個別指導塾）", rating: 4.3 },
  { name: "焼肉きんぐ", rating: 3.9 },
  { name: "GU", rating: 3.8 },
  { name: "ローソン", rating: 3.6 },
  { name: "くら寿司", rating: 3.7 },
  { name: "カラオケまねきねこ", rating: 3.4 },
  { name: "古本市場（BOOKOFF）", rating: 3.5 },
  { name: "セブン-イレブン", rating: 3.5 },
  { name: "スシロー", rating: 3.8 },
  { name: "ABCマート", rating: 3.6 },
  { name: "ドトールコーヒー", rating: 4.0 },
];

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

  const filtered = COMPANIES.filter((c) => search === "" || c.name.includes(search));

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <div
      className={`min-h-screen flex-1 bg-[color:var(--background)] text-[color:var(--foreground)] ${outfit.className}`}
      style={THEME}
    >
      <div className="bg-[color:var(--secondary)]">
        {/* Header */}
        <header className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white ring-2 ring-white/30 shrink-0">
            <Image
              src="/logo/Arbeit_checker_logo.png"
              alt="バイトチェッカー"
              fill
              className="object-cover"
            />
          </div>
          <button
            onClick={() => setShowWriteForm(true)}
            className="bg-[color:var(--primary)] text-white text-sm font-bold px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            口コミを書く
          </button>
        </header>

        {/* Hero */}
        <section className="text-white pt-6 pb-16">
          <div className="max-w-6xl mx-auto px-5">
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              バイト選びは
              <br />
              <span style={{ color: "var(--accent)" }}>口コミ</span>から始めよう。
            </h1>
            <p className="text-white/70 text-base leading-relaxed mb-8 font-medium">
              在職中の学生が書いたリアルな声。給与・雰囲気・シフトを事前にチェック。
            </p>

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
        <p className="text-sm text-[color:var(--muted-foreground)] mb-5">{filtered.length}件の口コミ</p>

        {filtered.length === 0 ? (
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
          onClick={() => setShowWriteForm(false)}
        >
          <div
            className="bg-[color:var(--card)] rounded-3xl w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-xl">口コミを投稿する</h3>
                <button
                  onClick={() => setShowWriteForm(false)}
                  className="w-8 h-8 rounded-full bg-[color:var(--background)] flex items-center justify-center text-sm font-bold hover:bg-[color:var(--border)] transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="企業名 *"
                  className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)]"
                />
                <div>
                  <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">総合評価</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        className="text-2xl text-[color:var(--border)] hover:text-[color:var(--accent)] transition-colors"
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={4}
                  placeholder="口コミ（給与・雰囲気・シフトなどリアルな情報を） *"
                  className="w-full px-4 py-3 rounded-xl border border-[color:var(--border)] text-sm font-medium outline-none focus:border-[color:var(--primary)] transition-colors bg-[color:var(--background)] resize-none"
                />
                <button className="w-full bg-[color:var(--primary)] text-white font-black py-3.5 rounded-xl hover:opacity-90 transition-opacity">
                  投稿する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
