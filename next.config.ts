import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.dsmcdn.com' },
      { protocol: 'https', hostname: '**.trendyol.com' },
      { protocol: 'https', hostname: '**.ty-cdn.com' },
    ],
  },
};

export default nextConfig;
