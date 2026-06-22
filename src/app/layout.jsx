import "./globals.css";
import "leaflet/dist/leaflet.css"; // bundle Leaflet's CSS locally (no CDN dependency)
import { Cormorant_Garamond, Inter } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";
import CapacitorInit from "@/components/CapacitorInit";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "Sipp — Cafés & fine dining in Dubai",
  description:
    "Cafés by day. Fine dining by night. Discover, save, rank and share places through people with taste.",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F0E6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <head />
      <body className="font-sans">
        <CapacitorInit />
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
