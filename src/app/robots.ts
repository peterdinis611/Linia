import type { MetadataRoute } from "next";
import { hallRobots } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return hallRobots();
}
