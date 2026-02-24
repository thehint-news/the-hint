import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ['error', 'info'],
    } : false,
  },
  // Increase timeout for static page generation (default 60s is too short
  // when fetching content from GitHub API on Vercel's single-worker free plan)
  staticPageGenerationTimeout: 120,
  images: {
    // Allow all external image sources used by articles and video thumbnails
    remotePatterns: [
      // Supabase Storage (article images)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      // YouTube thumbnails
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      // Instagram CDN (video poster thumbnails)
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      // Twitter/X media
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      // Vimeo CDN
      {
        protocol: 'https',
        hostname: 'i.vimeocdn.com',
      },
      // TikTok CDN
      {
        protocol: 'https',
        hostname: '*.tiktokcdn.com',
      },
      // LinkedIn media
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
      },
    ],
  },
};

export default nextConfig;
