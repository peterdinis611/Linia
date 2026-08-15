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
          background: "#f1eadc",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 22,
            height: 136,
            background: "#161310",
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 28,
            width: 56,
            height: 56,
            borderRadius: 56,
            background: "#c8102e",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 92,
            width: 36,
            height: 36,
            borderRadius: 36,
            background: "rgba(22, 19, 16, 0.28)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 132,
            width: 26,
            height: 26,
            borderRadius: 26,
            background: "rgba(22, 19, 16, 0.16)",
          }}
        />
      </div>
    ),
    size,
  );
}
