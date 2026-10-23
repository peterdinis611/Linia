import type { MetadataRoute } from "next";
import { en } from "@/i18n/messages/en";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Linia",
    short_name: "Linia",
    description: en.meta.description,
    start_url: "/en",
    display: "standalone",
    background_color: "#0c0e12",
    theme_color: "#ffb020",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
