#!/usr/bin/env python3
"""Reference QR encoder for Linia tickets (segno, ECC L, byte mode, full QR).

The hall prints QR in the browser, so the TypeScript encoder in src/lib/qr.ts
stays the runtime. This script is the source of truth that encoder must match:

    python3 scripts/qrencode.py "https://linia.example/sk?from=…"
    python3 scripts/qrencode.py --goldens
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import segno

ROOT = Path(__file__).resolve().parents[1]
GOLDENS = ROOT / "src" / "__tests__" / "lib" / "qr-goldens.json"

GOLDEN_VALUES = [
    "linia",
    "https://linia.test/en",
    (
        "http://localhost:3000/sk?from=52.52500*13.36900*STOP*stop-berlin*"
        "Berlin%20Hbf*Berlin&to=50.08300*14.43500*STOP*stop-prague*"
        "Praha%20hl.n.*Prague&at=2026-08-14T08%3A30&trip=2026-08-14T08:00:00Z~trip-ec-172"
    ),
]


def encode(value: str, mask: int | None = None) -> dict:
    qr = segno.make(
        value,
        error="L",
        boost_error=False,
        mode="byte",
        micro=False,
        mask=mask,
    )
    rows = ["".join("1" if cell else "0" for cell in row) for row in qr.matrix]
    return {
        "value": value,
        "version": int(qr.version),
        "mask": int(qr.mask),
        "size": len(rows),
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("value", nargs="?", help="Payload to encode (or stdin)")
    parser.add_argument("--mask", type=int, choices=range(8), metavar="0-7")
    parser.add_argument(
        "--goldens",
        action="store_true",
        help=f"Write {GOLDENS.relative_to(ROOT)}",
    )
    args = parser.parse_args()

    if args.goldens:
        payload = [encode(value) for value in GOLDEN_VALUES]
        GOLDENS.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {GOLDENS.relative_to(ROOT)} ({len(payload)} marks)")
        return

    value = args.value
    if value is None:
        value = __import__("sys").stdin.read().rstrip("\n")
    if not value:
        parser.error("missing value")
    print(json.dumps(encode(value, args.mask), separators=(",", ":")))


if __name__ == "__main__":
    main()
