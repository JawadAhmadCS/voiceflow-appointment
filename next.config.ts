import type { NextConfig } from "next";

/** Keep paths aligned with `src/config.ts` → `BOOKING_ROUTES`. */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/book-appointment", destination: "/api/book-appointment" },
      { source: "/appointments", destination: "/api/appointments" },
    ];
  },
};

export default nextConfig;
