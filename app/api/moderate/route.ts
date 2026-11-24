import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ModerationServiceError } from "@/lib/moderation/gemini";
import { moderateFields } from "@/lib/moderation/moderate";
import {
  MODERATION_FIELDS,
  MODERATION_MAX_CHARS,
  type ModerationErrorBody,
  type ModerationErrorCode,
  type ModerationFields,
} from "@/lib/moderation/types";

export const maxDuration = 30;

const MAX_BODY_BYTES = 50_000;

const ERROR_RESPONSES: Record<ModerationErrorCode, { status: number; message: string }> = {
  unauthorized: { status: 401, message: "ログインが必要です。ログインし直してください。" },
  bad_request: { status: 400, message: "リクエストの形式が正しくありません。" },
  too_long: {
    status: 413,
    message: `文字数が多すぎます。各項目を${MODERATION_MAX_CHARS}文字以内にしてください。`,
  },
  rate_limited: {
    status: 429,
    message: "検閲サービスが混み合っています。しばらく待ってから、もう一度投稿してください。",
  },
  unavailable: {
    status: 503,
    message: "検閲サービスに接続できませんでした。時間をおいて、もう一度投稿してください。",
  },
  misconfigured: {
    status: 500,
    message: "検閲サービスの設定に問題があります。管理者に連絡してください。",
  },
  internal: {
    status: 500,
    message: "検閲の処理中にエラーが発生しました。時間をおいて、もう一度お試しください。",
  },
};

function errorResponse(code: ModerationErrorCode) {
  const { status, message } = ERROR_RESPONSES[code];
  const body: ModerationErrorBody = { error: code, message };
  return Response.json(body, { status });
}

// 入力を検証して ModerationFields にする。形式が不正なら "bad_request"、長すぎれば "too_long"。
function parseFields(body: unknown): ModerationFields | "bad_request" | "too_long" {
  if (typeof body !== "object" || body === null) return "bad_request";
  const raw = (body as { fields?: unknown }).fields;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return "bad_request";

  const fields: ModerationFields = {};
  for (const field of MODERATION_FIELDS) {
    const value = (raw as Record<string, unknown>)[field];
    if (value === undefined) continue;
    if (typeof value !== "string") return "bad_request";
    if (value.length > MODERATION_MAX_CHARS) return "too_long";
    fields[field] = value;
  }
  return fields;
}

export async function POST(request: Request) {
  // proxy.ts でもログインは必須だが、無料枠の乱用を防ぐためここでも確認する
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("unauthorized");

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return errorResponse("too_long");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("bad_request");
  }

  const fields = parseFields(body);
  if (fields === "bad_request" || fields === "too_long") return errorResponse(fields);

  try {
    return Response.json(await moderateFields(fields));
  } catch (error) {
    // 投稿内容そのものはログに残さない
    if (error instanceof ModerationServiceError) {
      console.error(`[moderation] ${error.code}: ${error.message}`);
      return errorResponse(error.code);
    }
    console.error("[moderation] unexpected error:", error instanceof Error ? error.name : "unknown");
    return errorResponse("internal");
  }
}
