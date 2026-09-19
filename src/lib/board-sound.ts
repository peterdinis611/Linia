/**
 * board-sound.ts
 *
 * Synthesizes a mechanical split-flap / departure board "click" sound
 * using the Web Audio API. No audio files required.
 *
 * Usage:
 *   import { playFlap, isSoundEnabled, toggleSound } from "@/lib/board-sound";
 *
 *   playFlap();              // play one mechanical click
 *   playFlap(4);             // play a burst (e.g. 4-character flip sequence)
 *   toggleSound();           // enable / disable (persisted in localStorage)
 *   isSoundEnabled();        // returns boolean
 */

const STORAGE_KEY = "linia_board_sound_enabled";

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function isSoundEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  // Default ON if never set
  return stored === null ? true : stored === "true";
}

export function setSoundEnabled(value: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(value));
  }
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

// ---------------------------------------------------------------------------
// Audio context (lazy-initialised on first interaction)
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (_ctx.state === "suspended") {
    void _ctx.resume();
  }
  return _ctx;
}

// ---------------------------------------------------------------------------
// Sound synthesis
// ---------------------------------------------------------------------------

/**
 * Synthesizes one mechanical flap click.
 * The sound is a very short burst of filtered noise, like a card slapping
 * against a stop on a split-flap display.
 */
function synthesizeFlap(ctx: AudioContext, startTime: number, volume = 0.45) {
  // White-noise source
  const bufferSize = ctx.sampleRate * 0.04; // 40 ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Bandpass filter: makes it sound like plastic card impact
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 3200;
  bandpass.Q.value = 0.7;

  // High-shelf to add a crisp "snap" transient
  const shelf = ctx.createBiquadFilter();
  shelf.type = "highshelf";
  shelf.frequency.value = 6000;
  shelf.gain.value = 8;

  // Gain envelope: sharp attack, fast decay
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.04);

  source.connect(bandpass);
  bandpass.connect(shelf);
  shelf.connect(gain);
  gain.connect(ctx.destination);

  source.start(startTime);
  source.stop(startTime + 0.05);
}

/**
 * Play one or more flap clicks (e.g. burst of characters flipping).
 * @param count    Number of clicks to play (default 1)
 * @param spacing  Time between clicks in seconds (default 0.06)
 */
export function playFlap(count = 1, spacing = 0.06): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.01; // small offset to avoid scheduling glitches
  const clamped = Math.min(count, 20); // guard against huge bursts

  for (let i = 0; i < clamped; i++) {
    synthesizeFlap(ctx, now + i * spacing, 0.45 - i * 0.015);
  }
}

/**
 * Play a longer board-reset cascade (used when new results arrive).
 * Sounds like the whole board flipping through.
 */
export function playBoardCascade(characters = 8): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.01;

  // Fast initial burst then slowing down, like a flap board settling
  const timings = Array.from({ length: characters }, (_, i) => {
    const t = i * (0.04 + i * 0.008);
    return now + t;
  });

  timings.forEach((t, i) => {
    const vol = 0.55 - i * 0.02;
    synthesizeFlap(ctx, t, Math.max(0.1, vol));
  });
}
