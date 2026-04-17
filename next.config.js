/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow bundling of external packages used exclusively in server code.
    serverComponentsExternalPackages: ["appwrite", "cloudinary"],
  },
};

module.exports = nextConfig;