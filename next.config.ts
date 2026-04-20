import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/book-appointment", destination: "/api/book-appointment" },
      { source: "/appointments", destination: "/api/appointments" },
    ];
  },
};

export default nextConfig;
