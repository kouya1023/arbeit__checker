import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 許可リスト（ホワイトリスト）方式。
 * ここに列挙したパスだけがログイン不要でアクセスできる。
 * これ以外のページはすべて保護対象。
 * → 将来 app/ に新しいページを追加しても、ここに加えない限り自動的にログイン必須になる。
 * パスワード再設定や認証コールバックなど、ログイン前にアクセスさせたいページが
 * 増えた場合だけ、この配列に追記する。
 */
const PUBLIC_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  // Supabase のセッション Cookie を読み書きするためのレスポンス
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // createServerClient と getUser の間に処理を挟まないこと（セッション不整合を防ぐため）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // 未ログインで保護対象のページにアクセスした場合はログイン画面へ
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ログイン済みでログイン/新規登録ページに来た場合はホームへ
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスで実行:
     * - _next/static, _next/image (ビルド成果物・画像最適化)
     * - favicon.ico
     * - public 配下の静的ファイル（拡張子付き: .png, .svg, .ico など）
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
