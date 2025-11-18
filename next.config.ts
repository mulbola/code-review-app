import type { NextConfig } from "next";

// 기본 Next.js 설정 (Vercel 자동 호환)
const nextConfig: NextConfig = {
  // output: 'standalone', // Vercel 기본 런타임에서는 설정 필요없음
  // assetPrefix: '',      // public/ 경로는 '/' 기준
  // basePath: '',         // 루트 베이스, 맞춤 베이스 경로가 필요하다면 지정
};

export default nextConfig;
