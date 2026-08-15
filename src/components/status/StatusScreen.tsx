import type { ReactNode } from "react";
import { HallLoader } from "./HallLoader";

type StatusScreenProps = {
  mark?: string;
  kicker: string;
  title: string;
  body: string;
  busy?: boolean;
  brandKicker?: string;
  busyLabel?: string;
  actions?: ReactNode;
};

export function StatusScreen({
  mark,
  kicker,
  title,
  body,
  busy = false,
  brandKicker = "Open European timetables",
  busyLabel = "Live board",
  actions,
}: StatusScreenProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="signal-bar shrink-0" aria-hidden="true" />
      <header className="shrink-0 border-b border-rule px-4 py-4 sm:px-6">
        <p className="kicker">{brandKicker}</p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="font-display text-[2.15rem] leading-none font-semibold tracking-tight italic sm:text-[2.6rem]">
            Linia
          </p>
          <span
            className="live-lamp mb-1 inline-block h-2.5 w-2.5 rounded-full bg-signal"
            aria-hidden="true"
          />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="relative w-full max-w-lg overflow-hidden border border-dashed border-rule px-6 py-10 sm:px-8">
          <StatusGlyph />
          {mark ? <p className="empty-mark mb-5">{mark}</p> : null}
          <p className="kicker">{kicker}</p>
          <h1 className="font-display mt-2 max-w-[18ch] text-3xl leading-tight italic sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
            {body}
          </p>
          {busy ? <HallLoader label={busyLabel} /> : null}
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          <div className="rail-ornament mt-8" aria-hidden="true" />
        </div>
      </main>
    </div>
  );
}

function StatusGlyph() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="pointer-events-none absolute -top-3 -right-2 h-28 w-28 opacity-[0.09]"
      aria-hidden="true"
    >
      <rect x="36" y="8" width="8" height="64" fill="currentColor" />
      <circle cx="40" cy="22" r="10" fill="var(--signal)" />
      <circle cx="40" cy="44" r="8" fill="currentColor" opacity="0.35" />
      <circle cx="40" cy="62" r="6" fill="currentColor" opacity="0.2" />
    </svg>
  );
}
