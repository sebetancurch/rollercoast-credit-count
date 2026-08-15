import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Next 16 blocks cross-origin requests to dev-only endpoints, and the
  // "Network" URL it prints on this machine is the Hyper-V Default Switch
  // bridge — getNetworkHost() takes the first non-loopback interface, which
  // lands on the virtual adapter rather than the LAN address. Without this the
  // page served on that address loads and then never hydrates, because
  // /_next/hmr is refused.
  //
  // Prefer http://localhost:3000 regardless: a bare IP is not a secure context
  // in Chromium, so anything gated on one behaves differently there.
  allowedDevOrigins: ["172.17.128.1"],
};

export default nextConfig;
