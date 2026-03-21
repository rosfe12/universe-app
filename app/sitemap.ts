import type { MetadataRoute } from "next";

import { resolveAppUrl } from "@/lib/env";

const routes = [
  "/home",
  "/admission",
  "/school",
  "/community",
  "/lectures",
  "/profile",
  "/support",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = resolveAppUrl().replace(/\/+$/, "");
  const now = new Date();

  return routes.map((route) => ({
    url: `${appUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/home" ? "hourly" : "daily",
    priority: route === "/home" ? 1 : 0.7,
  }));
}
