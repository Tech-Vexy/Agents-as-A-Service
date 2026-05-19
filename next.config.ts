import type { NextConfig } from "next";
import path from "path";
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, '..'),
  },
  env: {
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL,
  },
};

export default nextConfig;
