import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.dsmcdn.com', // Trendyol CDN
      },
    ],
  },
};

export default nextConfig;
