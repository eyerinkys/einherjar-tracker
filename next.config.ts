import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next 16.3's CLI path can lose captured `tsc --showConfig` output.
    // TypeScript 5.9 still exposes the stable compiler API Next can use.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
