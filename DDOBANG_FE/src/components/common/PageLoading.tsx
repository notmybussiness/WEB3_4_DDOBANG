"use client";

import Image from "next/image";

interface PageLoadingProps {
  isLoading?: boolean;
}

export function PageLoading({ isLoading = true }: PageLoadingProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-white bg-opacity-80 z-50">
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-24">
          {/* 바람을 표현하는 선들 */}
          <div className="absolute inset-0 -left-6 flex items-center">
            <div className="space-y-2 animate-pulse">
              <div className="h-0.5 w-4 bg-[#FFD896] rounded-full opacity-70"></div>
              <div className="h-0.5 w-6 bg-[#FFD896] rounded-full opacity-70"></div>
              <div className="h-0.5 w-4 bg-[#FFD896] rounded-full opacity-70"></div>
            </div>
          </div>

          <div className="animate-bounce absolute inset-0">
            <Image src="/favicon.svg" alt="로딩 중" width={80} height={80} />
          </div>
        </div>
        <div className="mt-2 text-center text-[#FFB130] text-lg animate-pulse">
          로딩중
        </div>
      </div>
    </div>
  );
}
