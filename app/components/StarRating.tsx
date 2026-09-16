export default function StarRating({ value }: { value: number }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span className="inline-flex gap-0.5">
      {stars.map((s) => (
        <span key={s} className="text-sm" style={{ color: s <= Math.round(value) ? "#ffce00" : "#e2e8f0" }}>
          ★
        </span>
      ))}
    </span>
  );
}
