import Image from "next/image";
import Link from "next/link";
import { THEME, outfit } from "./theme";

export default function TopPage() {
  return (
    <div
      className={`flex flex-1 flex-col bg-[color:var(--secondary)] ${outfit.className}`}
      style={THEME}
    >
      <header className="max-w-6xl mx-auto w-full px-5 py-3">
        <Image
          src="/logo/Arbeit_checker_logo.png"
          alt="バイトチェッカー"
          width={64}
          height={64}
          priority
        />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4 text-white">
          バイト選びは
          <br />
          <span style={{ color: "var(--accent)" }}>口コミ</span>から始めよう。
        </h1>
        <p className="text-white/70 text-base leading-relaxed mb-8 font-medium max-w-md">
          在職中の学生が書いたリアルな声。給与・雰囲気・シフトを事前にチェック。
        </p>

        <div className="flex flex-col gap-4 text-base font-bold sm:flex-row">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full border border-white/30 px-6 text-white transition-colors hover:bg-white/10 sm:w-40"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--primary)] px-6 text-white transition-opacity hover:opacity-90 sm:w-40"
          >
            新規登録
          </Link>
        </div>
      </main>
    </div>
  );
}
