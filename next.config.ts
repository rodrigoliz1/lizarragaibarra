import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  turbopack: { root: process.cwd() },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
      {
        source: "/:path(portal|admin|api)/:rest*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "www.lizarragaibarra.com" }],
        destination: "https://lizarragaibarra.com/:path*",
        permanent: true,
      },
      { source: "/firma", destination: "/nosotros", permanent: true },
      { source: "/areas", destination: "/servicios", permanent: true },
      {
        source: "/admin/insights",
        destination: "/admin/articulos",
        permanent: false,
      },
      {
        source: "/admin/leads",
        destination: "/admin/formularios",
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
