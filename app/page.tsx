import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 px-6 text-center">
        <Image
          src="/logo/Arbeit_checker_logo.png"
          alt="バイトチェッカー"
          width={200}
          height={200}
          priority
        />
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          アルバイトのレビューサイト
        </p>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-6 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] sm:w-40"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] sm:w-40"
          >
            新規登録
          </Link>
        </div>
      </main>
    </div>
  );
}
