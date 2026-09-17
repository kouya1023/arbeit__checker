"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "../../theme";
import StarRating from "../../components/StarRating";

type ReviewSummary = { id: number; rating: number; numberOfPeople: string };

export default function StoreReviewListPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;

  const [storeName, setStoreName] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [storeResult, reviewResult] = await Promise.all([
        supabase.from("store").select("name").eq("id", storeId).maybeSingle(),
        supabase
          .from("review")
          .select("id, stage_evaluation, number_of_people")
          .eq("store_id", storeId),
      ]);

      if (reviewResult.error) {
        setError(reviewResult.error.message);
        setLoading(false);
        return;
      }

      setStoreName((storeResult.data?.name as string) ?? null);
      setReviews(
        (reviewResult.data ?? []).map((row) => ({
          id: row.id as number,
          rating: Number(row.stage_evaluation) || 0,
          numberOfPeople: (row.number_of_people as string) ?? "",
        }))
      );
      setLoading(false);
    }

    fetchData();
  }, [storeId]);

  return (
    <div
      className={`min-h-screen flex-1 bg-[color:var(--background)] text-[color:var(--foreground)] ${outfit.className}`}
      style={THEME}
    >
      <header className="bg-[color:var(--secondary)]">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <Link href="/home" className="text-white/70 hover:text-white text-sm font-bold">
            ← 店舗一覧に戻る
          </Link>
          <h1 className="text-white font-black text-2xl mt-2">{storeName ?? "口コミ一覧"}</h1>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-10">
        <p className="text-sm text-[color:var(--muted-foreground)] mb-5">
          {loading ? "読み込み中..." : `${reviews.length}件の口コミ`}
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
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-[color:var(--muted-foreground)]">
            <p className="font-semibold">この店舗の口コミはまだありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {reviews.map((r) => (
              <Link
                key={r.id}
                href={`/home/${storeId}/${r.id}`}
                className="block bg-[color:var(--card)] rounded-2xl p-5 border border-[color:var(--border)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <StarRating value={r.rating} />
                  <span className="text-sm font-bold text-[color:var(--muted-foreground)]">{r.rating.toFixed(1)}</span>
                </div>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  アルバイト人数: {r.numberOfPeople || "不明"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
