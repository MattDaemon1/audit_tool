import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['lighthouse', 'puppeteer-core', 'puppeteer'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'lighthouse': 'lighthouse',
        'puppeteer': 'puppeteer',
        'puppeteer-core': 'puppeteer-core'
      });
    }
    return config;
  }
};

export default nextConfig;
