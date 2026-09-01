import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { encodeQr } from "@/lib/qr";
import goldens from "./qr-goldens.json";

const FORMAT_L = [
  0b111011111000100, 0b111001011110011, 0b111110110101010, 0b111100010011101,
  0b110011000101111, 0b110001100011000, 0b110110001000001, 0b110100101110110,
];

type Golden = (typeof goldens)[number];

function finderAt(grid: boolean[][], x0: number, y0: number) {
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      expect(grid[y0 + y]![x0 + x]).toBe(edge || core);
    }
  }
}

function readFormat(grid: boolean[][]) {
  const coords: Array<[number, number]> = [];
  for (let index = 0; index < 6; index += 1) coords.push([8, index]);
  coords.push([8, 7], [8, 8], [7, 8]);
  for (let index = 5; index >= 0; index -= 1) coords.push([index, 8]);
  let bits = 0;
  for (let index = 0; index < coords.length; index += 1) {
    const [x, y] = coords[index]!;
    if (grid[y]![x]) bits |= 1 << index;
  }
  return bits;
}

function rowsToGrid(rows: string[]) {
  return rows.map((row) => Array.from(row, (cell) => cell === "1"));
}

function pythonReady() {
  try {
    execFileSync("python3", ["-c", "import segno"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function pythonMark(value: string, mask?: number): Golden {
  const args = [join(process.cwd(), "scripts/qrencode.py")];
  if (mask != null) {
    args.push("--mask", String(mask));
  }
  args.push(value);
  return JSON.parse(execFileSync("python3", args, { encoding: "utf8" })) as Golden;
}

describe("encodeQr", () => {
  it("prints finder marks and a valid L format on a short mark", () => {
    const grid = encodeQr("linia");
    expect(grid).not.toBeNull();
    const size = grid!.length;
    expect(size).toBe(21);
    finderAt(grid!, 0, 0);
    finderAt(grid!, size - 7, 0);
    finderAt(grid!, 0, size - 7);
    expect(FORMAT_L).toContain(readFormat(grid!));
    expect(grid![size - 8]![8]).toBe(true);
  });

  it("grows for a live share URL and keeps the finders", () => {
    const url =
      "http://localhost:3000/sk?from=52.52500*13.36900*STOP*stop-berlin*Berlin%20Hbf*Berlin&to=50.08300*14.43500*STOP*stop-prague*Praha%20hl.n.*Prague&at=2026-08-14T08%3A30&trip=2026-08-14T08:00:00Z~trip-ec-172";
    const grid = encodeQr(url);
    expect(grid).not.toBeNull();
    const size = grid!.length;
    expect((size - 21) % 4).toBe(0);
    expect(size).toBeGreaterThanOrEqual(25);
    finderAt(grid!, 0, 0);
    finderAt(grid!, size - 7, 0);
    finderAt(grid!, 0, size - 7);
    expect(FORMAT_L).toContain(readFormat(grid!));
  });

  it("refuses a payload bigger than version 20", () => {
    expect(encodeQr("x".repeat(900))).toBeNull();
  });

  it("matches segno goldens, mask for mask", () => {
    expect(goldens.length).toBeGreaterThan(0);
    for (const mark of goldens) {
      const grid = encodeQr(mark.value, { mask: mark.mask });
      expect(grid, mark.value).not.toBeNull();
      expect(grid!.map((row) => row.map((cell) => (cell ? "1" : "0")).join(""))).toEqual(
        mark.rows,
      );
    }
  });

  it.skipIf(!pythonReady())("matches a live segno mark from scripts/qrencode.py", () => {
    const value = "https://linia.test/sk?trip=ec-172";
    const mark = pythonMark(value);
    const grid = encodeQr(value, { mask: mark.mask });
    expect(grid).toEqual(rowsToGrid(mark.rows));
  });
});
