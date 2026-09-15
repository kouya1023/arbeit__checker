const posts = [
  {
    id: 1,
    title: "コンビニ夜勤バイトのリアルな評判教えてください",
    author: "しゅん",
    date: "2026-09-14",
    replies: 12,
  },
  {
    id: 2,
    title: "居酒屋の時給が上がったので報告します",
    author: "みさき",
    date: "2026-09-13",
    replies: 5,
  },
  {
    id: 3,
    title: "塾講師バイトってシフト融通利きますか？",
    author: "たける",
    date: "2026-09-12",
    replies: 8,
  },
  {
    id: 4,
    title: "カフェバイトの研修がきつすぎた話",
    author: "ゆい",
    date: "2026-09-10",
    replies: 21,
  },
  {
    id: 5,
    title: "履歴書の書き方でアドバイスください",
    author: "そら",
    date: "2026-09-08",
    replies: 3,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/[.08] bg-white px-6 py-4 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-bold tracking-tight text-black dark:text-zinc-50">
          バイトチェッカー掲示板
        </h1>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            新着スレッド
          </h2>
          <button className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">
            スレッドを立てる
          </button>
        </div>

        <ul className="flex flex-col divide-y divide-black/[.08] rounded-lg border border-black/[.08] bg-white dark:divide-white/[.145] dark:border-white/[.145] dark:bg-zinc-950">
          {posts.map((post) => (
            <li key={post.id}>
              <a
                href="#"
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.06] sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-black dark:text-zinc-50">
                  {post.title}
                </span>
                <span className="flex shrink-0 gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>{post.author}</span>
                  <span>{post.date}</span>
                  <span>返信 {post.replies}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
