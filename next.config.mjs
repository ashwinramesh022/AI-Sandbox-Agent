/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed for streaming responses
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
