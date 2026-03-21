import type { MetadataRoute } from "next";

import { resolveAppUrl, shouldShowTestAccounts } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const appUrl = resolveAppUrl();
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)/.test(appUrl);
  const blocked = isLocal || shouldShowTestAccounts();

  return {
    rules: blocked
      ? {
          userAgent: "*",
          disallow: "/",
        }
      : {
          userAgent: "*",
          allow: "/",
        },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
