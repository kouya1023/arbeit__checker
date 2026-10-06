"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "../theme";

const EMAIL_DOMAIN = "cs.u-ryukyu.ac.jp";
const LOCAL_PART_PATTERN = /^[a-zA-Z0-9._%+-]+$/;

export default function Login() {
  const router = useRouter();
  const [emailLocal, setEmailLocal] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedLocal = emailLocal.trim();
    if (!LOCAL_PART_PATTERN.test(trimmedLocal)) {
      setError("メールアドレスの@より前を正しく入力してください。");
      return;
    }

    const email = `${trimmedLocal}@${EMAIL_DOMAIN}`;

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      if (signInError.message === "Email not confirmed") {
        setError("メールアドレスが未確認です。確認メール内のリンクから認証を完了してください。");
      } else if (signInError.message === "Invalid login credentials") {
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else {
        setError(signInError.message);
      }
      return;
    }

    router.push("/home");
  }

  async function handleGuestLogin() {
    setError("");
    setGuestLoading(true);
    const { error: guestError } = await supabase.auth.signInAnonymously();
    setGuestLoading(false);

    if (guestError) {
      setError("ゲストログインに失敗しました。時間をおいて再度お試しください。");
      return;
    }

    router.push("/home");
  }

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center bg-[color:var(--background)] text-[color:var(--foreground)] px-6 ${outfit.className}`}
      style={THEME}
    >
      <main className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-3xl font-black tracking-tight text-center">ログイン</h1>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-bold">
              メールアドレス
            </label>
            <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] focus-within:border-[color:var(--primary)] transition-colors">
              <input
                id="email"
                type="text"
                required
                value={emailLocal}
                onChange={(e) => setEmailLocal(e.target.value)}
                placeholder="eXXXXXX"
                autoComplete="username"
                className="min-w-0 flex-1 bg-transparent px-3 outline-none"
              />
              <span className="flex items-center whitespace-nowrap bg-[color:var(--background)] px-3 text-sm font-medium text-[color:var(--muted-foreground)]">
                @{EMAIL_DOMAIN}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-bold">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              autoComplete="current-password"
              className="h-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 outline-none focus:border-[color:var(--primary)] transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-[color:var(--primary)] px-6 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "ログイン中..." : "ログインする"}
          </button>

          <p className="text-center text-sm text-[color:var(--muted-foreground)]">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup" className="font-bold text-[color:var(--primary)] hover:underline">
              新規登録
            </Link>
          </p>
        </form>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-[color:var(--border)]" />
          <span className="text-xs text-[color:var(--muted-foreground)]">または</span>
          <span className="h-px flex-1 bg-[color:var(--border)]" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="flex h-11 w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-6 font-bold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--background)] disabled:opacity-60"
          >
            {guestLoading ? "ログイン中..." : "ゲストとしてログイン"}
          </button>
          <p className="text-center text-xs text-[color:var(--muted-foreground)]">
            アカウント登録なしでお試しいただけます。
          </p>
        </div>
      </main>
    </div>
  );
}
