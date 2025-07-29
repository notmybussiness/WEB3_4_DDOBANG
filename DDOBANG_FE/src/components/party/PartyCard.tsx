'use client'

import { components } from '@/lib/backend/apiV1/schema'
import Image from 'next/image'

type PartySummaryResponse = components['schemas']['PartySummaryResponse']

interface PartyCardProps {
    party: PartySummaryResponse
    onClick?: (party: PartySummaryResponse) => void
}

// 모임 카드 컴포넌트
export function PartyCard({ party, onClick }: PartyCardProps) {
    const handleClick = () => {
        if (onClick) {
            onClick(party)
        }
    }

    // 이미지 URL이 유효한지 확인하는 함수
    const isValidImageUrl = (url?: string) => {
        if (!url) return false
        if (url.startsWith('/')) return true
        return true
    }

    return (
        <div
            className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
            onClick={handleClick}
        >
            {/* 이미지 섹션 */}
            <div className="relative aspect-[4/3] bg-gray-700 overflow-hidden">
                <Image
                    src={
                        party.themeThumbnailUrl && isValidImageUrl(party.themeThumbnailUrl)
                            ? party.themeThumbnailUrl
                            : '/default-thumbnail.svg'
                    }
                    alt={party.title || '모임 이미지'}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
                    priority
                />
            </div>

            <div className="p-5">
                <h3 className="font-bold text-lg mb-3 text-white">{party.title || '제목 없음'}</h3>
                <p className="text-gray-400 text-sm mb-3">모임</p>

                <div className="space-y-2 mb-3">
                    <div className="flex items-center text-gray-400 text-sm">
                        <Image src="/calendar.svg" alt="날짜" width={16} height={16} className="mr-1.5" />
                        <span>
                            {party.scheduledAt ? new Date(party.scheduledAt).toLocaleDateString() : '날짜 정보 없음'}
                        </span>
                    </div>
                    <div className="flex items-center text-gray-400 text-sm">
                        <Image src="/members.svg" alt="인원" width={16} height={16} className="mr-1.5" />
                        <span>{`${party.acceptedParticipantsCount || 0}/${party.totalParticipants || 0}`}</span>
                    </div>
                    <div className="flex items-center text-gray-400 text-sm">
                        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <span>{party.storeName || '위치 정보 없음'}</span>
                    </div>
                </div>

                <div className="flex items-center">
                    <div className="w-6 h-6 mr-2 rounded-full overflow-hidden relative">
                        <Image
                            src={party.hostProfilePictureUrl || '/default-profile.svg'}
                            alt={party.hostNickname || '모임장'}
                            fill
                            className="object-cover"
                            sizes="24px"
                            unoptimized
                        />
                    </div>
                    <span className="text-sm text-gray-400">{party.hostNickname || '모임장'}</span>
                </div>
            </div>
        </div>
    )
}
