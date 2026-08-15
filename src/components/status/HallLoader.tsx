import { SearchingTrack } from "./SearchingTrack";

export function HallLoader({
  label,
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={compact ? "hall-loader hall-loader-compact" : "hall-loader"}
      data-testid="hall-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <SearchingTrack />
      {label ? <p className="hall-loader-label">{label}</p> : null}
    </div>
  );
}
