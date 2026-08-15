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
      <div className="hall-loader-dial" aria-hidden="true">
        <span className="hall-loader-ring" />
        <span className="hall-loader-hub" />
      </div>
      <div className="searching-signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="searching-flaps" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        {compact ? null : (
          <>
            <span />
            <span />
            <span />
          </>
        )}
      </div>
      <SearchingTrack />
      {label ? <p className="hall-loader-label">{label}</p> : null}
    </div>
  );
}
