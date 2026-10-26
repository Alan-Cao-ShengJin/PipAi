import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@pip/domain"],
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,
};

export default config;
