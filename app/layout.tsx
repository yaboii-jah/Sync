import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import localFont from "next/font/local";
import { ServiceWorkerRegistration } from "@/components/push/service-worker-registration";
import "./globals.css";

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
    "Your companion app for AWS Student Community Day Manila 2026.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#024056",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${perandory.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
