import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppProviders } from "@/components/shared/AppProviders";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { CLUB_NAME, CLUB_NAME_SHORT } from "@/lib/brand/club";
import { sidebarInitScript } from "@/lib/layout/sidebar-init-script";

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
  title: {
    default: `${CLUB_NAME_SHORT} — Portal`,
    template: `%s — ${CLUB_NAME_SHORT}`,
  },
  description: `Portal de ${CLUB_NAME}: familias y dirección. Pagos (anotación) y reserva de ropa.`,
  appleWebApp: {
    capable: true,
    title: CLUB_NAME_SHORT,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f0f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script id="cvo-sidebar-init" dangerouslySetInnerHTML={{ __html: sidebarInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
