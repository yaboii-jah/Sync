import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import localFont from "next/font/local";
import { ServiceWorkerRegistration } from "@/components/push/service-worker-registration";
import { Providers } from "./providers";
import "./globals.css";

/*
 * Portal typefaces. Only the signed-out landing (`app/page.tsx`) consumes
 * these — it sets Lato inline and reaches Perandory through the `font-display`
 * utility. They are declared here because next/font must run in a layout, not
 * because the authenticated HeroUI screens use them.
 */
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const perandory = localFont({
  src: "./fonts/COMMERCIAL/PERANDORY/Perandory-Semi-Condensed.otf",
  variable: "--font-perandory",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sync — Student Edition",
  description:
    "Your companion app for AWS Student Community Day Mega Manila 2026.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-icon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${perandory.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
