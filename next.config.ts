import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment
  output: "standalone",

  // Enable Turbopack (default in Next.js 16)
  turbopack: {},

  // Allow Three.js WebGPU imports
  transpilePackages: ["three"],

  // Environment variables available at build time
  env: {
    COMMIT_SHA: process.env.COMMIT_SHA || "development",
  },

  // Webpack configuration for Three.js compatibility
  webpack: (config) => {
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({
        "utf-8-validate": "commonjs utf-8-validate",
        bufferutil: "commonjs bufferutil",
      });
    }
    return config;
  },
};

export default nextConfig;
