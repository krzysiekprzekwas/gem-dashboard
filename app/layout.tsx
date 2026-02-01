import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GEM Dashboard - Global Equity Momentum Strategy Tracker",
  description: "Track Global Equity Momentum (GEM) investment signals in real-time. Momentum scores for US and EU markets with historical analysis and allocation insights.",
  keywords: ["GEM", "Global Equity Momentum", "investment strategy", "momentum investing", "SPY", "VEU", "BND", "portfolio allocation"],
  authors: [{ name: "Krzysztof Przekwas" }],
  creator: "Krzysztof Przekwas",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gem-dashboard.vercel.app'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "GEM Dashboard",
    title: "GEM Dashboard - Global Equity Momentum Strategy Tracker",
    description: "Track Global Equity Momentum (GEM) investment signals in real-time. Momentum scores for US and EU markets with historical analysis and allocation insights.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "GEM Dashboard - Global Equity Momentum Strategy Tracker",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GEM Dashboard - Global Equity Momentum Strategy Tracker",
    description: "Track Global Equity Momentum (GEM) investment signals in real-time. Momentum scores for US and EU markets with historical analysis and allocation insights.",
    images: ["/og.png"],
    creator: "@krzysiekprzekw1",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

