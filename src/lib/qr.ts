/** Byte-mode QR, ECC L, versions 1–20. Enough for a live Linia share URL. */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    EXP[index] = value;
    LOG[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < 512; index += 1) EXP[index] = EXP[index - 255]!;
})();

function gfMul(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

function rsRemainder(data: number[], ecCount: number) {
  let gen = [1];
  for (let index = 0; index < ecCount; index += 1) {
    const next = new Array(gen.length + 1).fill(0);
    for (let pos = 0; pos < gen.length; pos += 1) {
      next[pos] ^= gfMul(gen[pos]!, EXP[index]!);
      next[pos + 1] ^= gen[pos]!;
    }
    gen = next;
  }
  const rest = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ rest[0]!;
    rest.shift();
    rest.push(0);
    for (let index = 0; index < ecCount; index += 1) {
      rest[index] ^= gfMul(gen[index + 1]!, factor);
    }
  }
  return rest;
}

// [ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] for versions 1–20, ECC L
const BLOCKS_L: Array<[number, number, number, number, number]> = [
  [7, 1, 19, 0, 0],
  [10, 1, 34, 0, 0],
  [15, 1, 55, 0, 0],
  [20, 1, 80, 0, 0],
  [26, 1, 108, 0, 0],
  [18, 2, 68, 0, 0],
  [20, 2, 78, 0, 0],
  [24, 2, 97, 0, 0],
  [30, 2, 116, 0, 0],
  [18, 2, 68, 2, 69],
  [20, 4, 81, 0, 0],
  [24, 2, 92, 2, 93],
  [26, 4, 107, 0, 0],
  [30, 3, 115, 1, 116],
  [22, 5, 87, 1, 88],
  [24, 5, 98, 1, 99],
  [28, 1, 107, 5, 108],
  [30, 5, 120, 1, 121],
  [28, 3, 113, 4, 114],
  [28, 3, 107, 5, 108],
];

const ALIGN: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
];

function versionSize(version: number) {
  return 21 + 4 * (version - 1);
}

function dataCapacity(version: number) {
  const [, g1, d1, g2, d2] = BLOCKS_L[version - 1]!;
  return g1 * d1 + g2 * d2;
}

function pushBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push((value >>> index) & 1);
  }
}

function encodeBytes(bytes: number[], version: number) {
  const countBits = version < 10 ? 8 : 16;
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, countBits);
  for (const byte of bytes) pushBits(bits, byte, 8);
  const capacity = dataCapacity(version) * 8;
  const remain = Math.min(4, capacity - bits.length);
  for (let index = 0; index < remain; index += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const pad = [0b11101100, 0b00010001];
  let padIndex = 0;
  while (bits.length < capacity) {
    pushBits(bits, pad[padIndex % 2]!, 8);
    padIndex += 1;
  }
  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[index + bit]!;
    codewords.push(value);
  }
  return codewords;
}

function interleave(version: number, data: number[]) {
  const [ec, g1, d1, g2, d2] = BLOCKS_L[version - 1]!;
  const blocks: number[][] = [];
  const ecc: number[][] = [];
  let offset = 0;
  const groups: Array<[number, number]> = [
    [g1, d1],
    [g2, d2],
  ];
  for (const [count, words] of groups) {
    for (let index = 0; index < count; index += 1) {
      const slice = data.slice(offset, offset + words);
      offset += words;
      blocks.push(slice);
      ecc.push(rsRemainder(slice, ec));
    }
  }
  const out: number[] = [];
  const maxData = Math.max(d1, d2);
  for (let index = 0; index < maxData; index += 1) {
    for (const block of blocks) {
      if (index < block.length) out.push(block[index]!);
    }
  }
  for (let index = 0; index < ec; index += 1) {
    for (const block of ecc) out.push(block[index]!);
  }
  return out;
}

function reserved(size: number, version: number) {
  const mark = Array.from({ length: size }, () => new Uint8Array(size));
  function fill(x0: number, y0: number, w: number, h: number) {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        if (x >= 0 && y >= 0 && x < size && y < size) mark[y]![x] = 1;
      }
    }
  }
  fill(0, 0, 9, 9);
  fill(size - 8, 0, 8, 9);
  fill(0, size - 8, 9, 8);
  fill(6, 0, 1, size);
  fill(0, 6, size, 1);
  const align = ALIGN[version - 1] ?? [];
  for (const y of align) {
    for (const x of align) {
      if ((x < 9 && y < 9) || (x > size - 10 && y < 9) || (x < 9 && y > size - 10)) {
        continue;
      }
      fill(x - 2, y - 2, 5, 5);
    }
  }
  if (version >= 7) {
    fill(0, size - 11, 6, 3);
    fill(size - 11, 0, 3, 6);
  }
  return mark;
}

function finder(grid: Uint8Array[], x0: number, y0: number) {
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      grid[y0 + y]![x0 + x] = edge || core ? 1 : 0;
    }
  }
}

function alignment(grid: Uint8Array[], cx: number, cy: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const ring = Math.max(Math.abs(x), Math.abs(y));
      grid[cy + y]![cx + x] = ring === 1 ? 0 : 1;
    }
  }
}

function maskBit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function formatBits(mask: number) {
  let bits = (0b01 << 13) | (mask << 10);
  let value = bits;
  const gen = 0b10100110111;
  for (let index = 14; index >= 10; index -= 1) {
    if ((value >>> index) & 1) value ^= gen << (index - 10);
  }
  bits = (bits | value) ^ 0b101010000010010;
  return bits;
}

function drawFormat(grid: Uint8Array[], mask: number) {
  const size = grid.length;
  const bits = formatBits(mask);
  const coords: Array<[number, number]> = [];
  for (let index = 0; index < 6; index += 1) coords.push([8, index]);
  coords.push([8, 7], [8, 8], [7, 8]);
  for (let index = 5; index >= 0; index -= 1) coords.push([index, 8]);
  for (let index = 0; index < 8; index += 1) {
    const bit = (bits >>> (14 - index)) & 1;
    const [x, y] = coords[index]!;
    grid[y]![x] = bit;
  }
  for (let index = 0; index < 8; index += 1) {
    grid[8]![size - 1 - index] = (bits >>> (14 - index)) & 1;
  }
  for (let index = 0; index < 7; index += 1) {
    grid[size - 7 + index]![8] = (bits >>> (6 - index)) & 1;
  }
  grid[size - 8]![8] = 1;
}

function placeData(grid: Uint8Array[], reservedMap: Uint8Array[], bits: number[]) {
  const size = grid.length;
  let bit = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const y = up ? size - 1 - step : step;
      for (const dx of [0, -1]) {
        const x = col + dx;
        if (reservedMap[y]![x]) continue;
        grid[y]![x] = bits[bit] ?? 0;
        bit += 1;
      }
    }
    up = !up;
  }
}

function score(grid: Uint8Array[]) {
  const size = grid.length;
  let total = 0;
  for (let y = 0; y < size; y += 1) {
    let run = 1;
    for (let x = 1; x < size; x += 1) {
      if (grid[y]![x] === grid[y]![x - 1]) run += 1;
      else {
        if (run >= 5) total += run - 2;
        run = 1;
      }
    }
    if (run >= 5) total += run - 2;
  }
  for (let x = 0; x < size; x += 1) {
    let run = 1;
    for (let y = 1; y < size; y += 1) {
      if (grid[y]![x] === grid[y - 1]![x]) run += 1;
      else {
        if (run >= 5) total += run - 2;
        run = 1;
      }
    }
    if (run >= 5) total += run - 2;
  }
  let dark = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) dark += grid[y]![x]!;
  }
  total += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return total;
}

function drawFunctions(grid: Uint8Array[], version: number) {
  const size = grid.length;
  finder(grid, 0, 0);
  finder(grid, size - 7, 0);
  finder(grid, 0, size - 7);
  const align = ALIGN[version - 1] ?? [];
  for (const y of align) {
    for (const x of align) {
      if ((x < 9 && y < 9) || (x > size - 10 && y < 9) || (x < 9 && y > size - 10)) {
        continue;
      }
      alignment(grid, x, y);
    }
  }
  for (let index = 8; index < size - 8; index += 1) {
    grid[6]![index] = index % 2 === 0 ? 1 : 0;
    grid[index]![6] = index % 2 === 0 ? 1 : 0;
  }
}

export function encodeQr(value: string): boolean[][] | null {
  const bytes = Array.from(new TextEncoder().encode(value));
  let version = 0;
  for (let index = 1; index <= 20; index += 1) {
    const header = index < 10 ? 4 + 8 : 4 + 16;
    const need = header + bytes.length * 8 + 4;
    if (need <= dataCapacity(index) * 8) {
      version = index;
      break;
    }
  }
  if (!version) return null;
  const size = versionSize(version);
  const data = interleave(version, encodeBytes(bytes, version));
  const bits: number[] = [];
  for (const word of data) pushBits(bits, word, 8);
  const reservedMap = reserved(size, version);
  let best: Uint8Array[] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const grid = Array.from({ length: size }, () => new Uint8Array(size));
    drawFunctions(grid, version);
    placeData(grid, reservedMap, bits);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!reservedMap[y]![x] && maskBit(mask, x, y)) {
          grid[y]![x] = grid[y]![x] ? 0 : 1;
        }
      }
    }
    drawFormat(grid, mask);
    const penalty = score(grid);
    if (penalty < bestScore) {
      bestScore = penalty;
      best = grid;
    }
  }
  return best ? best.map((row) => Array.from(row, (cell) => cell === 1)) : null;
}
