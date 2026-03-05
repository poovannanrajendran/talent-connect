/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow larger payloads for resume uploads (PDFs can be up to ~5MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
