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
        background: "#f1eadc",
        color: "#161310",
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
              background: "#161310",
              borderRadius: 3,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              width: 44,
              height: 44,
              borderRadius: 44,
              background: "#c8102e",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 58,
              width: 28,
              height: 28,
              borderRadius: 28,
              background: "rgba(22, 19, 16, 0.28)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 98,
              width: 20,
              height: 20,
              borderRadius: 20,
              background: "rgba(22, 19, 16, 0.16)",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#6e675d",
              fontWeight: 700,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 64,
              fontStyle: "italic",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1,
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
            background: "#d4cbb8",
          }}
        />
        <div
          style={{
            fontSize: route ? 52 : 36,
            fontStyle: "italic",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            maxWidth: 1040,
          }}
        >
          {route ?? headline}
        </div>
      </div>
    </div>
  );
}
