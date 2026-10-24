const STARS = [1, 2, 3, 4, 5];

export default function StarRating({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(5, value));
  const fillPercent = (clamped / 5) * 100;

  return (
    <span
      className="relative inline-flex"
      role="img"
      aria-label={`5段階中 ${clamped.toFixed(1)}`}
    >
      {/* 背景（空の星） */}
      <span className="inline-flex gap-0.5 text-sm" style={{ color: "#e2e8f0" }} aria-hidden>
        {STARS.map((s) => (
          <span key={s}>★</span>
        ))}
      </span>
      {/* 前景（評価の割合だけ塗りつぶし） */}
      <span
        className="absolute inset-0 inline-flex gap-0.5 overflow-hidden whitespace-nowrap text-sm"
        style={{ color: "#ffce00", width: `${fillPercent}%` }}
        aria-hidden
      >
        {STARS.map((s) => (
          <span key={s}>★</span>
        ))}
      </span>
    </span>
  );
}
