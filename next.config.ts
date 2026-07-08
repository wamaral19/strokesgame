import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  webpack: (config) => {
    // The local workspace uses a dependency symlink for this generated app.
    // Ignoring dependency folders keeps the dev watcher focused on source files.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/node_modules/**", "**/.next/**"],
    };
    return config;
  },
};

export default nextConfig;
