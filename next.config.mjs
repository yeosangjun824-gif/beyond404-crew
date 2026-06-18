/** @type {import('next').NextConfig} */
const backendOrigin = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8082";

const nextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["172.30.1.32"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
