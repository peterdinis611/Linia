import { OG_IMAGE_SIZE } from "@/lib/seo";

type OgCardProps = {
  kicker: string;
  headline: string;
  from?: string;
  to?: string;
};

export const OG_SIZE = OG_IMAGE_SIZE;

export function OgCard({ kicker, headline, from, to }: OgCardProps) {
  const route = from && to ? `${from}  →  ${to}` : null;
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0c0e12",
        color: "#e8edf2",
        padding: "56px 64px",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 56,
            height: 140,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 14,
              height: 140,
              background: "#1a1f27",
              borderRadius: 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              width: 44,
              height: 44,
              borderRadius: 44,
              background: "#ffb020",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 58,
              width: 28,
              height: 28,
              borderRadius: 28,
              background: "rgba(255, 176, 32, 0.35)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 98,
              width: 20,
              height: 20,
              borderRadius: 20,
              background: "rgba(255, 176, 32, 0.18)",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#8b97a8",
              fontWeight: 700,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "0.02em",
              lineHeight: 1,
              color: "#ffb020",
            }}
          >
            Linia
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            height: 2,
            width: "100%",
            background: "#ffb020",
          }}
        />
        <div
          style={{
            fontSize: route ? 52 : 36,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "0.01em",
            maxWidth: 1040,
          }}
        >
          {route ?? headline}
        </div>
      </div>
    </div>
  );
}
