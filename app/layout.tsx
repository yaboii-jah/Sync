import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import { ServiceWorkerRegistration } from "@/components/push/service-worker-registration";
import { Providers } from "./providers";
import "./globals.css";

/* Event typefaces are mapped to the shared UI tokens in globals.css. */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const perandory = localFont({
  src: "./fonts/COMMERCIAL/PERANDORY/Perandory-Semi-Condensed.otf",
  variable: "--font-perandory",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sync",
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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#052f3c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${perandory.variable} dark h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
