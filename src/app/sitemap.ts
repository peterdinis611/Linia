import type { MetadataRoute } from "next";
import { hallSitemap } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return hallSitemap();
}
