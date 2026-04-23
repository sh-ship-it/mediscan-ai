/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Disables image optimization to save CPU on low-end laptops
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@/components/ui"], // Speeds up compilation
  },
};

export default nextConfig;
