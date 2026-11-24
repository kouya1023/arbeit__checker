import path from "node:path";
import * as kuromoji from "kuromoji";
import type { NameTokenizer } from "./mask";

// 辞書の読み込みは重いので、サーバープロセス内で1回だけ行って使い回す。
let tokenizerPromise: Promise<NameTokenizer> | null = null;

export function getTokenizer(): Promise<NameTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise<NameTokenizer>((resolve, reject) => {
      kuromoji
        .builder({ dicPath: path.join(process.cwd(), "node_modules", "kuromoji", "dict") })
        .build((error, tokenizer) => (error ? reject(error) : resolve(tokenizer)));
    });
    // 失敗したままキャッシュしないよう、次の呼び出しで再試行できるようにする
    tokenizerPromise.catch(() => {
      tokenizerPromise = null;
    });
  }
  return tokenizerPromise;
}
