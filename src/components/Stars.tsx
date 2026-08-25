// Static star rating display (server-safe). Rounds to the nearest whole star.
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={className} aria-label={`${value.toFixed(1)} de 5 estrelas`} title={`${value.toFixed(1)} / 5`}>
      <span aria-hidden="true">{"★".repeat(full)}{"☆".repeat(5 - full)}</span>
    </span>
  );
}
