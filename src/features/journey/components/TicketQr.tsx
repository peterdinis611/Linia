"use client";

import { useMemo } from "react";
import { encodeQr } from "@/lib/qr";

export function TicketQr({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const matrix = useMemo(() => encodeQr(value), [value]);
  if (!matrix || matrix.length === 0) return null;
  const size = matrix.length;
  let path = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (matrix[y]![x]) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <figure className="print-qr" data-testid="print-qr">
      <svg
        className="print-qr-mark"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
      >
        <rect width={size} height={size} fill="#f7f1e4" />
        <path d={path} fill="#161310" />
      </svg>
      <figcaption className="print-qr-caption">{label}</figcaption>
    </figure>
  );
}
