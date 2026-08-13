import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "exifr", "tesseract.js", "tesseract.js-core"],
  turbopack: {},
};

export default nextConfig;
