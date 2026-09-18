import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Lizárraga & Ibarra Abogados | Litigio y estrategia",
    template: "%s | Lizárraga & Ibarra",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [{ url: "/brand/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/brand/og.png"] },
  robots:
    process.env.VERCEL_ENV === "preview"
      ? { index: false, follow: false }
      : { index: true, follow: true },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5f0",
  colorScheme: "light",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
