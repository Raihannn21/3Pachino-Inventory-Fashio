/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    // Allow optimization of local images
    formats: ['image/webp', 'image/avif'],
    // Optional: Add remote patterns if needed for external images
    remotePatterns: [
      // Add external image domains here if needed
    ],
  },
}

module.exports = nextConfig
