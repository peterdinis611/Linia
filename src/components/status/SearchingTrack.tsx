export type TrackVehicle = "train" | "car";

export function SearchingTrack() {
  return (
    <div className="searching-scene" aria-hidden="true" data-testid="searching-track">
      <div className="searching-road">
        <span className="searching-vehicle" data-testid="searching-vehicle" data-vehicle="car">
          <CarMark />
        </span>
      </div>
      <div className="searching-railway">
        <span className="searching-vehicle" data-testid="searching-vehicle" data-vehicle="train">
          <TrainMark />
        </span>
      </div>
    </div>
  );
}

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.38} opacity="0.35" />
    </g>
  );
}

function CarMark() {
  return (
    <svg viewBox="0 0 84 36" fill="currentColor">
      <path d="M16 18.5 24.5 8.2h22.8l12.4 10.3H72c4.2 0 7.2 2.6 7.2 6.2v3.4H8.2V24c0-3.2 3.2-5.5 7.8-5.5z" />
      <rect x="26.2" y="10.4" width="10.6" height="7.2" rx="0.8" opacity="0.32" />
      <rect x="38.8" y="10.4" width="12.4" height="7.2" rx="0.8" opacity="0.32" />
      <rect x="70.6" y="20.2" width="5.4" height="2.4" rx="0.6" opacity="0.55" />
      <rect x="10.4" y="20.6" width="4.2" height="2.2" rx="0.5" opacity="0.4" />
      <Wheel cx={22} cy={29.2} r={5.1} />
      <Wheel cx={62} cy={29.2} r={5.1} />
    </svg>
  );
}

function TrainMark() {
  return (
    <svg viewBox="0 0 128 36" fill="currentColor">
      <rect x="4" y="9" width="34" height="16" rx="1.8" />
      <rect x="40" y="9" width="34" height="16" rx="1.8" />
      <path d="M76 9h28.5L116 15.4v9.6H76z" />
      <path d="M104 5.2h6.4v4.2h-6.4z" opacity="0.85" />
      <path d="M106.2 1.6h2.2v4h-2.2z" />
      <rect x="9" y="12.2" width="8.4" height="5.4" rx="0.5" opacity="0.32" />
      <rect x="20.2" y="12.2" width="8.4" height="5.4" rx="0.5" opacity="0.32" />
      <rect x="45" y="12.2" width="8.4" height="5.4" rx="0.5" opacity="0.32" />
      <rect x="56.2" y="12.2" width="8.4" height="5.4" rx="0.5" opacity="0.32" />
      <rect x="82" y="12.2" width="10.2" height="6" rx="0.5" opacity="0.28" />
      <rect x="113.4" y="17.4" width="5.6" height="2.4" rx="0.5" opacity="0.55" />
      <Wheel cx={14} cy={29.4} r={4.6} />
      <Wheel cx={28} cy={29.4} r={4.6} />
      <Wheel cx={50} cy={29.4} r={4.6} />
      <Wheel cx={64} cy={29.4} r={4.6} />
      <Wheel cx={90} cy={29.4} r={4.6} />
      <Wheel cx={104} cy={29.4} r={4.6} />
    </svg>
  );
}
