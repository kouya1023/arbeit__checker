// 外部サービスへ送る前に、文章中の個人情報をローカルで [電話番号] などのプレースホルダーに置き換える。
// 方式: 正規表現（連絡先・住所など）＋ kuromoji.js（人名）。人名の検出精度は固有表現抽出モデルより低い。

export type NameToken = {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  pos_detail_2: string;
};

export type NameTokenizer = {
  tokenize(text: string): NameToken[];
};

export type MaskPiece = {
  maskedStart: number;
  maskedEnd: number;
  originalStart: number;
  originalEnd: number;
  replaced: boolean;
};

export type MaskedText = {
  original: string;
  masked: string;
  pieces: MaskPiece[];
  labels: string[];
};

type Range = { start: number; end: number; label: string };

// 全角英数記号を半角に、各種ハイフンを "-" に揃える（文字数は変えない。位置を元の文章と1対1で対応させるため）
function foldForMatching(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0);
    } else if (code === 0x3000) {
      out += " ";
    } else if ((code >= 0x2010 && code <= 0x2015) || code === 0x2212) {
      out += "-";
    } else {
      out += text[i];
    }
  }
  return out;
}

const PREFECTURE = "(?:北海道|東京都|京都府|大阪府|[\\u4e00-\\u9fff]{2,3}県)";
const ADDRESS_CHARS = "[^\\s\\d、。，,！？!?]";

const PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "URL", regex: /(?:https?:\/\/|www\.)[^\s<>"'「」『』（）()]+/gi },
  {
    label: "メールアドレス",
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  // 区切りあり: 098-123-4567 / (098) 123 4567 / +81 90-1234-5678
  {
    label: "電話番号",
    regex: /(?<!\d)(?:\+81[-\s]?\d{1,4}|0\d{1,4})[-\s()]\d{1,4}[-\s)]\d{3,4}(?!\d)/g,
  },
  // 区切りなし: 09012345678
  { label: "電話番号", regex: /(?<!\d)0\d{9,10}(?!\d)/g },
  // 〒マークがあるものだけ（「時給800-1000円」のような金額を誤検出しないため）
  { label: "郵便番号", regex: /〒\s?\d{3}-?\d{4}/g },
  // 都道府県 + 市区町村 + 番地（例: 沖縄県那覇市おもろまち1-2-3）。番地がない地名だけの記述は対象外
  {
    label: "住所",
    regex: new RegExp(
      `${PREFECTURE}${ADDRESS_CHARS}{0,12}?(?:市|区|町|村|郡)${ADDRESS_CHARS}{0,12}?\\d+(?:丁目)?(?:-\\d+)*(?:番地?)?(?:\\d+号?)?`,
      "g",
    ),
  },
  // マイナンバー・カード番号など 12〜16 桁の数字列
  { label: "番号", regex: /(?<!\d)\d(?:[ -]?\d){11,15}(?!\d)/g },
  { label: "SNSアカウント", regex: /(?<![A-Za-z0-9_@.])@[A-Za-z0-9_]{3,30}(?![A-Za-z0-9_@])/g },
  // 琉球大の学籍番号形式（例: e215701）
  { label: "学籍番号", regex: /(?<![A-Za-z0-9])[eE]\d{6}(?!\d)/g },
];

function findPatternRanges(original: string): Range[] {
  const folded = foldForMatching(original);
  const ranges: Range[] = [];
  for (const { label, regex } of PATTERNS) {
    for (const match of folded.matchAll(regex)) {
      if (match.index === undefined || match[0].length === 0) continue;
      ranges.push({ start: match.index, end: match.index + match[0].length, label });
    }
  }
  return ranges;
}

// IPADIC の「固有名詞 > 人名」を検出する。1文字だけの単独トークン（春・大 など）は誤検出が多いので除外し、
// 「新垣」「太郎」のように連続する人名は1つにまとめる。
function findPersonRanges(original: string, tokenizer: NameTokenizer): Range[] {
  const found: Range[] = [];
  let cursor = 0;
  for (const token of tokenizer.tokenize(original)) {
    const index = original.indexOf(token.surface_form, cursor);
    if (index < 0) continue;
    cursor = index + token.surface_form.length;
    if (token.pos === "名詞" && token.pos_detail_1 === "固有名詞" && token.pos_detail_2 === "人名") {
      found.push({ start: index, end: cursor, label: "人名" });
    }
  }

  const merged: Range[] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && last.end === range.start) last.end = range.end;
    else merged.push({ ...range });
  }
  return merged.filter((range) => range.end - range.start >= 2);
}

function pickNonOverlapping(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const picked: Range[] = [];
  let lastEnd = 0;
  for (const range of sorted) {
    if (range.start < lastEnd) continue;
    picked.push(range);
    lastEnd = range.end;
  }
  return picked;
}

export function maskPersonalInfo(original: string, tokenizer: NameTokenizer): MaskedText {
  const patternRanges = pickNonOverlapping(findPatternRanges(original));

  const personRanges = findPersonRanges(original, tokenizer).filter(
    (person) => !patternRanges.some((r) => person.start < r.end && r.start < person.end),
  );

  const ranges = pickNonOverlapping([...patternRanges, ...personRanges]);

  let masked = "";
  let cursor = 0;
  const pieces: MaskPiece[] = [];
  const labels: string[] = [];

  const pushPlain = (from: number, to: number) => {
    if (to <= from) return;
    pieces.push({
      maskedStart: masked.length,
      maskedEnd: masked.length + (to - from),
      originalStart: from,
      originalEnd: to,
      replaced: false,
    });
    masked += original.slice(from, to);
  };

  for (const range of ranges) {
    pushPlain(cursor, range.start);
    const placeholder = `[${range.label}]`;
    pieces.push({
      maskedStart: masked.length,
      maskedEnd: masked.length + placeholder.length,
      originalStart: range.start,
      originalEnd: range.end,
      replaced: true,
    });
    masked += placeholder;
    labels.push(range.label);
    cursor = range.end;
  }
  pushPlain(cursor, original.length);

  return { original, masked, pieces, labels };
}

// マスク後の文章上の範囲を、元の文章上の範囲に戻す。プレースホルダーにかかる場合は元の範囲全体に広げる。
export function toOriginalRange(
  maskedText: MaskedText,
  maskedStart: number,
  maskedEnd: number,
): { start: number; end: number } | null {
  if (maskedEnd <= maskedStart) return null;

  let start = -1;
  let end = -1;
  for (const piece of maskedText.pieces) {
    if (start < 0 && maskedStart >= piece.maskedStart && maskedStart < piece.maskedEnd) {
      start = piece.replaced ? piece.originalStart : piece.originalStart + (maskedStart - piece.maskedStart);
    }
    if (maskedEnd > piece.maskedStart && maskedEnd <= piece.maskedEnd) {
      end = piece.replaced ? piece.originalEnd : piece.originalStart + (maskedEnd - piece.maskedStart);
    }
  }
  return start >= 0 && end > start ? { start, end } : null;
}
