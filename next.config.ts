import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['drive.google.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
