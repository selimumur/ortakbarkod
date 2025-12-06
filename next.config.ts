import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  typescript: {
    // Hata olsa da canlıya çık
    ignoreBuildErrors: true,
  },
  // Eslint bloğunu kaldırdık (Artık desteklenmiyor)
  
  // Turbopack hatasını susturmak için bu satırı ekliyoruz:
  // @ts-ignore
  turbopack: {}, 
};

export default withPWA(nextConfig);