import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Make GEMINI_API_KEY available in API routes (server-side only)
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  },
};

export default nextConfig;
