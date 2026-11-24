import { judgeWithGemini, ModerationServiceError, type ModelIssue, type ModelVerdict } from "./gemini";
import { maskPersonalInfo, toOriginalRange, type MaskedText, type NameTokenizer } from "./mask";
import { getTokenizer } from "./tokenizer";
import {
  MODERATION_FIELDS,
  type ModerationField,
  type ModerationFields,
  type ModerationIssue,
  type ModerationResult,
} from "./types";

export type ModerationDeps = {
  tokenizer?: NameTokenizer;
  judge?: (maskedFields: Record<string, string>) => Promise<ModelVerdict>;
};

const MAX_EXCERPT_CHARS = 120;
const MAX_REASON_CHARS = 200;
const BLOCKED_REASON = "AIの安全基準により、内容を判定できませんでした。表現を見直してから、もう一度投稿してください。";
const UNSPECIFIED_REASON = "不適切な表現が含まれている可能性があります。";

function clamp(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isSubmittedField(
  field: string,
  masked: Partial<Record<ModerationField, MaskedText>>,
): field is ModerationField {
  return (MODERATION_FIELDS as string[]).includes(field) && masked[field as ModerationField] !== undefined;
}

// AI が返した該当箇所（マスク後の文章から引用されたもの）を、投稿者が入力した元の文章上の箇所に戻す。
function toIssue(
  issue: ModelIssue,
  masked: Partial<Record<ModerationField, MaskedText>>,
): ModerationIssue {
  const field = isSubmittedField(issue.field, masked) ? issue.field : null;
  const quote = issue.excerpt.trim();
  let excerpt = quote;

  if (field && quote) {
    const maskedText = masked[field]!;
    const index = maskedText.masked.indexOf(quote);
    if (index >= 0) {
      const range = toOriginalRange(maskedText, index, index + quote.length);
      if (range) excerpt = maskedText.original.slice(range.start, range.end);
    }
  }

  return {
    field,
    excerpt: clamp(excerpt, MAX_EXCERPT_CHARS),
    reason: clamp(issue.reason.trim() || UNSPECIFIED_REASON, MAX_REASON_CHARS),
  };
}

export async function moderateFields(
  fields: ModerationFields,
  deps: ModerationDeps = {},
): Promise<ModerationResult> {
  const submitted = MODERATION_FIELDS.flatMap((field) => {
    const text = fields[field];
    return typeof text === "string" && text.trim() !== "" ? [[field, text] as const] : [];
  });
  if (submitted.length === 0) return { allowed: true, issues: [] };

  let tokenizer: NameTokenizer;
  try {
    tokenizer = deps.tokenizer ?? (await getTokenizer());
  } catch {
    // 人名のマスキングができない状態で外部へ送ってはいけないので、ここで止める
    throw new ModerationServiceError("internal", "Failed to load the name-masking dictionary");
  }

  const masked: Partial<Record<ModerationField, MaskedText>> = {};
  const payload: Record<string, string> = {};
  for (const [field, text] of submitted) {
    const result = maskPersonalInfo(text, tokenizer);
    masked[field] = result;
    payload[field] = result.masked;
  }

  const verdict = await (deps.judge ?? judgeWithGemini)(payload);

  if (verdict.kind === "blocked") {
    return { allowed: false, issues: [{ field: null, excerpt: "", reason: BLOCKED_REASON }] };
  }

  const issues = verdict.issues.map((issue) => toIssue(issue, masked));
  // 「allowed: true」でも指摘が付いていれば不許可として扱う（モデルの出力の矛盾に備える）
  const allowed = verdict.allowed && issues.length === 0;
  if (!allowed && issues.length === 0) {
    issues.push({ field: null, excerpt: "", reason: UNSPECIFIED_REASON });
  }
  return { allowed, issues };
}
