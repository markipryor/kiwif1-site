import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  staticPageGenerationTimeout: 600,
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
