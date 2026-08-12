import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { PwaRegister, PwaInstallButton } from "@/components/pwa-install";
import { Toaster } from "@/components/ui";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sg",
});
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "Punktgenau – Reiseführer-GPS-Scanner",
  description:
    "Fotografiere Koordinaten aus dem Reiseführer, erkenne sie per OCR, prüfe sie auf der Karte, navigiere mit Google Maps – exportiere als KML, CSV oder GeoJSON.",
  manifest: "/manifest.webmanifest",
  applicationName: "Punktgenau",
  appleWebApp: {
    capable: true,
    title: "Punktgenau",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: true,
    address: false,
    email: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0b0d0a",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0d0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${fraunces.variable} ${grotesk.variable} ${plex.variable} antialiased min-h-dvh flex flex-col`}
      >
        <PwaRegister />
        <SiteHeader />
        <main className="flex-1 flex flex-col">{children}</main>
        <PwaInstallButton />
        <Toaster />
      </body>
    </html>
  );
}
