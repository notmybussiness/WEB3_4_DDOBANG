import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Docker 배포를 위한 standalone 모드 활성화
  experimental: {
    outputFileTracingRoot: undefined, // 파일 추적 최적화
  },
};

export default nextConfig;
