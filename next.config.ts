import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // kuromoji は辞書ファイルを実行時に fs で読むため、バンドルせず Node のモジュールとして使う
  serverExternalPackages: ["kuromoji"],
  // 辞書は import されないのでファイルトレースに映らない。検閲 API のデプロイ物に明示的に含める
  outputFileTracingIncludes: {
    "/api/moderate": ["./node_modules/kuromoji/dict/**/*"],
  },
};

export default nextConfig;
