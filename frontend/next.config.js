/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  },
  async rewrites() {
    if (!process.env.BACKEND_URL) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
