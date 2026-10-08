import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://webytex-sceneops.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SceneOps | See the shift. Find the moment.",
  description:
    "Explore three synchronized warehouse camera views, ask AI what changed, and inspect timestamped evidence. An open source Webytex Business demo using synthetic footage.",
  icons: { icon: "/mark.svg" },
  openGraph: {
    title: "SceneOps | See the shift. Find the moment.",
    description:
      "Three camera views. One searchable story. A video evidence workbench by Webytex.",
    type: "website",
    locale: "en_CA",
    url: siteUrl,
    siteName: "SceneOps by Webytex",
  },
  twitter: {
    card: "summary",
    title: "SceneOps by Webytex",
    description: "Explore the shift. Ask what changed. Follow the evidence.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171A1F",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
