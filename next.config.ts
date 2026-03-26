import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com", "localhost", "127.0.0.1", "0.0.0.0"],
  async redirects() {
    return [
      {
        source: "/admission",
        destination: "/school?tab=admission",
        permanent: true,
      },
      {
        source: "/admission/:id",
        destination: "/school?tab=admission&post=:id",
        permanent: true,
      },
      {
        source: "/career",
        destination: "/community?filter=career",
        permanent: true,
      },
      {
        source: "/our-school",
        destination: "/school",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
