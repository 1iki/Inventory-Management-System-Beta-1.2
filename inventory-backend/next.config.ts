import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // ⚠️ CORS headers removed from here - handled by middleware.ts instead
  // This prevents duplicate/multiple CORS headers issue
  // middleware.ts dynamically sets the correct single origin based on request
  
  // Optimize for production
  compress: true,
  poweredByHeader: false,
  
  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
