import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
  sw: "service-worker.js",
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
