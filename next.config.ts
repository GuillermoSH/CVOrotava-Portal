import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  async redirects() {
    return [
      {
        source: "/register",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
