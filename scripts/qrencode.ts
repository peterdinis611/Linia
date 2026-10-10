/**
 * QR mark helper for Linia tickets (ECC L, byte mode, versions 1–20).
 *
 * Runtime encoding lives in `src/lib/qr.ts`. This script regenerates fixtures
 * or prints one mark as JSON:
 *
 *   bun scripts/qrencode.ts "https://linia.example/sk?from=…"
 *   bun scripts/qrencode.ts --goldens
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeQr } from "../src/lib/qr";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GOLDENS = join(ROOT, "src/__tests__/lib/qr-goldens.json");

const GOLDEN_VALUES = [
  "linia",
  "https://linia.test/en",
  "http://localhost:3000/sk?from=52.52500*13.36900*STOP*stop-berlin*" +
    "Berlin%20Hbf*Berlin&to=50.08300*14.43500*STOP*stop-prague*" +
    "Praha%20hl.n.*Prague&at=2026-08-14T08%3A30&trip=2026-08-14T08:00:00Z~trip-ec-172",
];

export type QrMark = {
  value: string;
  version: number;
  mask: number;
  size: number;
  rows: string[];
};

function sameGrid(left: boolean[][], right: boolean[][]) {
  if (left.length !== right.length) return false;
  for (let y = 0; y < left.length; y += 1) {
    const a = left[y]!;
    const b = right[y]!;
    if (a.length !== b.length) return false;
    for (let x = 0; x < a.length; x += 1) {
      if (a[x] !== b[x]) return false;
    }
  }
  return true;
}

export function encode(value: string, mask?: number): QrMark {
  const grid = encodeQr(value, mask == null ? {} : { mask });
  if (!grid) {
    throw new Error(`payload too long for QR versions 1–20: ${value.slice(0, 48)}…`);
  }
  const size = grid.length;
  const version = (size - 17) / 4;
  let chosen = mask ?? 0;
  if (mask == null) {
    for (let candidate = 0; candidate < 8; candidate += 1) {
      const pinned = encodeQr(value, { mask: candidate });
      if (pinned && sameGrid(pinned, grid)) {
        chosen = candidate;
        break;
      }
    }
  }
  return {
    value,
    version,
    mask: chosen,
    size,
    rows: grid.map((row) => row.map((cell) => (cell ? "1" : "0")).join("")),
  };
}

function main() {
  const args = process.argv.slice(2);
  const goldens = args.includes("--goldens");
  const maskFlag = args.indexOf("--mask");
  const mask =
    maskFlag >= 0 && args[maskFlag + 1] != null
      ? Number.parseInt(args[maskFlag + 1]!, 10)
      : undefined;
  const value = args.find(
    (arg, index) =>
      !arg.startsWith("-") &&
      !(maskFlag >= 0 && index === maskFlag + 1),
  );

  if (goldens) {
    const payload = GOLDEN_VALUES.map((item) => encode(item));
    mkdirSync(dirname(GOLDENS), { recursive: true });
    writeFileSync(GOLDENS, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`wrote src/__tests__/lib/qr-goldens.json (${payload.length} marks)`);
    return;
  }

  if (!value) {
    console.error("usage: bun scripts/qrencode.ts [--mask 0-7] <value>");
    console.error("       bun scripts/qrencode.ts --goldens");
    process.exit(1);
  }
  if (mask != null && (Number.isNaN(mask) || mask < 0 || mask > 7)) {
    console.error("--mask must be 0–7");
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(encode(value, mask))}\n`);
}

main();
