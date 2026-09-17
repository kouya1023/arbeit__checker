"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "../../../theme";
import StarRating from "../../../components/StarRating";

type ReviewDetail = { rating: number; numberOfPeople: string; jobDescription: string; jobGap: string };

export default function ReviewDetailPage() {
  const params = useParams<{ storeId: string; reviewId: string }>();
  const { storeId, reviewId } = params;

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReview() {
      setLoading(true);
      const { data, error } = await supabase
        .from("review")
        .select("stage_evaluation, number_of_people, job_description, job_gap")
        .eq("id", reviewId)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setReview({
        rating: Number(data.stage_evaluation) || 0,
        numberOfPeople: (data.number_of_people as string) ?? "",
        jobDescription: (data.job_description as string) ?? "",
        jobGap: (data.job_gap as string) ?? "",
      });
      setLoading(false);
    }

    fetchReview();
  }, [reviewId]);

  return (
    <div
      className={`min-h-screen flex-1 bg-[color:var(--background)] text-[color:var(--foreground)] ${outfit.className}`}
      style={THEME}
    >
      <header className="bg-[color:var(--secondary)]">
        <div className="max-w-3xl mx-auto px-5 py-4">
          <Link href={`/home/${storeId}`} className="text-white/70 hover:text-white text-sm font-bold">
            ← 口コミ一覧に戻る
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-5 py-10">
        {loading ? (
          <div className="text-center py-16 text-[color:var(--muted-foreground)]">
            <p className="font-semibold">読み込み中...</p>
          </div>
        ) : error || !review ? (
          <div className="text-center py-16 text-[color:var(--muted-foreground)]">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="font-semibold">データの取得に失敗しました</p>
            {error && <p className="text-sm mt-1">{error}</p>}
          </div>
        ) : (
          <div className="bg-[color:var(--card)] rounded-2xl p-6 border border-[color:var(--border)] space-y-5">
            <div>
              <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">総合評価</p>
              <div className="flex items-center gap-2">
                <StarRating value={review.rating} />
                <span className="font-bold">{review.rating.toFixed(1)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">大学生バイトの人数</p>
              <p className="font-medium">{review.numberOfPeople || "不明"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">業務内容</p>
              <p className="leading-relaxed whitespace-pre-wrap">{review.jobDescription || "記載なし"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[color:var(--muted-foreground)] mb-2">求人情報とのギャップ</p>
              <p className="leading-relaxed whitespace-pre-wrap">{review.jobGap || "記載なし"}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
