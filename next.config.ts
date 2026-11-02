import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Opskriftsbilleder sendes med formularen; de bliver gjort mindre i telefonen først, men giv plads til store.
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
};

export default nextConfig;
