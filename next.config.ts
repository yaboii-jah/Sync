import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "http", hostname: "127.0.0.1", port: "45421", pathname: "/storage/v1/object/public/event-branding/**" },
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/event-branding/**" },
    ],
  },
};

export default nextConfig;
