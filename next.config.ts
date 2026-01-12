import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Turbopack (default in Next.js 16)
  turbopack: {},
  // Allow Three.js WebGPU imports
  transpilePackages: ["three"],
};

export default nextConfig;
