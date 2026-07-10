import "~/styles/globals.css";

import { type Metadata } from "next";
import { Roboto } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { SiteHeader } from "~/components/site-header";
import { ThemeProvider } from "~/components/theme-provider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Kāinga Compass",
  description:
    "Find where in Aotearoa fits the life you're building — affordability, career, growth, and lifestyle.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider>
          <NuqsAdapter>
            <TRPCReactProvider>
              <SiteHeader />
              {children}
            </TRPCReactProvider>
          </NuqsAdapter>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
