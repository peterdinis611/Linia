"use client";

import { useEffect, useRef, useState } from "react";

export type TrackVehicle = "train" | "bus";

export function SearchingTrack() {
  const [vehicle, setVehicle] = useState<TrackVehicle | null>(null);
  const markRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setVehicle(Math.random() < 0.5 ? "train" : "bus");
  }, []);

  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    const onLap = () => setVehicle((current) => (current === "train" ? "bus" : "train"));
    mark.addEventListener("animationiteration", onLap);
    return () => mark.removeEventListener("animationiteration", onLap);
  }, [vehicle]);

  return (
    <div className="searching-track" aria-hidden="true" data-vehicle={vehicle ?? undefined}>
      {vehicle ? (
        <span
          ref={markRef}
          className="searching-vehicle"
          data-testid="searching-vehicle"
          data-vehicle={vehicle}
        >
          {vehicle === "train" ? <TrainMark /> : <BusMark />}
        </span>
      ) : null}
    </div>
  );
}

function TrainMark() {
  return (
    <svg viewBox="0 0 56 18" fill="currentColor">
      <rect x="1.6" y="4.2" width="18.4" height="9.6" rx="1.1" />
      <rect x="20.6" y="4.2" width="18.4" height="9.6" rx="1.1" />
      <path d="M39.2 4.4h9.2L54.2 7.6v6.2H39.2z" />
      <rect x="4.6" y="6.1" width="4.4" height="3.2" opacity="0.38" />
      <rect x="11.6" y="6.1" width="4.4" height="3.2" opacity="0.38" />
      <rect x="23.6" y="6.1" width="4.4" height="3.2" opacity="0.38" />
      <rect x="30.6" y="6.1" width="4.4" height="3.2" opacity="0.38" />
      <rect x="42.4" y="6.2" width="4.2" height="3.1" opacity="0.38" />
      <circle cx="8.4" cy="15.1" r="1.85" />
      <circle cx="17.2" cy="15.1" r="1.85" />
      <circle cx="27.4" cy="15.1" r="1.85" />
      <circle cx="36.2" cy="15.1" r="1.85" />
      <circle cx="46.8" cy="15.1" r="1.85" />
    </svg>
  );
}

function BusMark() {
  return (
    <svg viewBox="0 0 48 18" fill="currentColor">
      <path d="M2.2 5.1c0-1.2.9-2.2 2.1-2.2h37.2c1.6 0 2.9 1.2 3.1 2.8l.8 6.6H2.2z" />
      <rect x="2.2" y="12.3" width="43.2" height="1.6" />
      <rect x="6.2" y="5.2" width="5.1" height="3.4" opacity="0.38" />
      <rect x="13.4" y="5.2" width="5.1" height="3.4" opacity="0.38" />
      <rect x="20.6" y="5.2" width="5.1" height="3.4" opacity="0.38" />
      <rect x="27.8" y="5.2" width="5.1" height="3.4" opacity="0.38" />
      <rect x="36.6" y="5.2" width="6.4" height="3.6" opacity="0.28" />
      <circle cx="11.2" cy="15.1" r="1.95" />
      <circle cx="36.4" cy="15.1" r="1.95" />
    </svg>
  );
}
