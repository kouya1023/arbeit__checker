import type { ModerationFields, ModerationResult } from "./types";

export type ModerationCheck =
  | { ok: true; result: ModerationResult }
  // 検閲そのものが実行できなかった（結果が不明）。投稿は止める。
  | { ok: false; message: string };

const FALLBACK_MESSAGE =
  "検閲サービスの応答が正しくありません。ログイン状態を確認して、時間をおいてからもう一度お試しください。";

function isModerationResult(value: unknown): value is ModerationResult {
  if (typeof value !== "object" || value === null) return false;
  const { allowed, issues } = value as { allowed?: unknown; issues?: unknown };
  return typeof allowed === "boolean" && Array.isArray(issues);
}

export async function requestModeration(fields: ModerationFields): Promise<ModerationCheck> {
  try {
    const response = await fetch("/api/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    // ログインが切れていると HTML のログイン画面が返るため、JSON でなければ null になる
    const body: unknown = await response.json().catch(() => null);

    if (response.ok && isModerationResult(body)) return { ok: true, result: body };

    const message =
      typeof body === "object" && body !== null && typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : FALLBACK_MESSAGE;
    return { ok: false, message };
  } catch {
    return { ok: false, message: "検閲サービスに接続できませんでした。通信状況を確認して、もう一度お試しください。" };
  }
}
