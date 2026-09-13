import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ServiceWorkerRegistration } from "@/components/push/service-worker-registration";
import { Providers } from "./providers";
import "./globals.css";

/* Event typefaces are mapped to the shared UI tokens in globals.css. */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    "A focused event companion for schedules, live updates, and attendee connection.",
  openGraph: {
    type: "website",
    siteName: "Sync",
    title: "Sync — Flawless event flow",
    description:
      "Your event day, in one place: the live schedule, session alerts, and attendee networking.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sync — Flawless event flow",
    description:
      "Your event day, in one place: the live schedule, session alerts, and attendee networking.",
  },
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
      className={`${geist.variable} ${geistMono.variable} ${perandory.variable} dark h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
