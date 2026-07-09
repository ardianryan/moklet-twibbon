import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "./_components/header";
import SonnerWrapper from "./_components/sonner-wrapper";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Smansage Twibbon - Create Custom Twibbons Without Watermarks",
    template: "%s | Smansage Twibbon",
  },
  description:
    "Create and share custom twibbons without watermarks. A fast, simple twibbon campaign platform designed for the Smansage community and beyond.",
  creator: "Smansage Dev Team",
  keywords: [
    "twibbon",
    "twibbon maker",
    "twibbon generator",
    "Smansage",
    "SMAN 1 Sooko",
    "photo frame",
    "profile picture",
    "free twibbon",
    "no watermark",
    "custom twibbon",
    "campaign twibbon",
  ],
  robots: {
    index: true,
    follow: true,
  },
  authors: [{ name: "Smansage Dev Team" }],
  alternates: {
    canonical: "https://twibbon.smansage.org/",
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#52815C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SonnerWrapper />
        <Header />
        {children}
      </body>
    </html>
  );
}
