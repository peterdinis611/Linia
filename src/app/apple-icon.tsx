import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0e12",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 22,
            height: 136,
            background: "#1a1f27",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 28,
            width: 56,
            height: 56,
            borderRadius: 56,
            background: "#ffb020",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 92,
            width: 36,
            height: 36,
            borderRadius: 36,
            background: "rgba(255, 176, 32, 0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 132,
            width: 26,
            height: 26,
            borderRadius: 26,
            background: "rgba(255, 176, 32, 0.18)",
          }}
        />
      </div>
    ),
    size,
  );
}
