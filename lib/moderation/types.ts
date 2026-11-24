// ブラウザとサーバーの両方から読み込まれるため、Node 専用の import は置かない。

export const MODERATION_FIELD_LABELS = {
  storeName: "店舗名",
  departmentName: "部署",
  jobDescription: "業務内容",
  jobGap: "求人情報とのギャップ",
} as const;

export type ModerationField = keyof typeof MODERATION_FIELD_LABELS;

export const MODERATION_FIELDS = Object.keys(MODERATION_FIELD_LABELS) as ModerationField[];

// 1項目あたりの最大文字数（Gemini 無料枠の消費と悪用を抑えるため）
export const MODERATION_MAX_CHARS = 2000;

export type ModerationFields = Partial<Record<ModerationField, string>>;

export type ModerationIssue = {
  // 項目を特定できない指摘（AI側の安全基準でブロックされた場合など）は null
  field: ModerationField | null;
  // 投稿者が入力した元の文章から抜き出した該当箇所（特定できない場合は空文字）
  excerpt: string;
  reason: string;
};

export type ModerationResult = {
  allowed: boolean;
  issues: ModerationIssue[];
};

export type ModerationErrorCode =
  | "unauthorized"
  | "bad_request"
  | "too_long"
  | "rate_limited"
  | "unavailable"
  | "misconfigured"
  | "internal";

export type ModerationErrorBody = {
  error: ModerationErrorCode;
  message: string;
};
