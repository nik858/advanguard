import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Canonical host: the production .vercel.app alias must not serve the
      // site (duplicate content). Framework-level redirects run before the
      // middleware, which would otherwise swallow "/" (its matcher includes it).
      {
        source: "/:path*",
        has: [{ type: "host", value: "advanguard.vercel.app" }],
        destination: "https://www.bookingleak.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
