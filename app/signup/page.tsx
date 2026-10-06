"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { THEME, outfit } from "../theme";

const EMAIL_DOMAIN = "cs.u-ryukyu.ac.jp";
const LOCAL_PART_PATTERN = /^[a-zA-Z0-9._%+-]+$/;

export default function Signup() {
  const [username, setUsername] = useState("");
  const [emailLocal, setEmailLocal] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    const trimmedLocal = emailLocal.trim();

    if (!trimmedUsername) {
      setError("ユーザーネームを入力してください。");
      return;
    }
    if (!LOCAL_PART_PATTERN.test(trimmedLocal)) {
      setError("メールアドレスの@より前を正しく入力してください。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }

    const email = `${trimmedLocal}@${EMAIL_DOMAIN}`;

    setSubmitting(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: trimmedUsername },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setDone(true);
  }

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center bg-[color:var(--background)] text-[color:var(--foreground)] px-6 ${outfit.className}`}
      style={THEME}
    >
      <main className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-3xl font-black tracking-tight text-center">新規登録</h1>

        {done ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
            <p className="text-4xl mb-3">📧</p>
            <p className="font-bold mb-2">確認メールを送信しました</p>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {`${emailLocal.trim()}@${EMAIL_DOMAIN}`} 宛のメール内のリンクから認証を完了してください。
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--primary)] px-6 font-bold text-white transition-opacity hover:opacity-90"
            >
              ログイン画面へ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-bold">
                ユーザーネーム
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例: 琉大太郎"
                className="h-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 outline-none focus:border-[color:var(--primary)] transition-colors"
              />
            </div>

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
              <p className="text-xs text-[color:var(--muted-foreground)]">
                @{EMAIL_DOMAIN} のメールアドレスのみ登録できます。
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-bold">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                autoComplete="new-password"
                className="h-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 outline-none focus:border-[color:var(--primary)] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password-confirm" className="text-sm font-bold">
                パスワード（確認用）
              </label>
              <input
                id="password-confirm"
                type="password"
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="もう一度入力してください"
                autoComplete="new-password"
                className="h-11 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 outline-none focus:border-[color:var(--primary)] transition-colors"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-[color:var(--primary)] px-6 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "登録中..." : "登録する"}
            </button>

            <p className="text-center text-sm text-[color:var(--muted-foreground)]">
              すでにアカウントをお持ちの方は{" "}
              <Link href="/login" className="font-bold text-[color:var(--primary)] hover:underline">
                ログイン
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
