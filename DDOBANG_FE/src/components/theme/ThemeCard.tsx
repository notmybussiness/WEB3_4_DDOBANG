'use client'

import { components } from '@/lib/backend/apiV1/schema'
import Image from 'next/image'
import Link from 'next/link'

type ThemeResponse = components['schemas']['ThemesResponse']

// 인기/최신 테마 카드 컴포넌트
export function ThemeCard({ room }: { room: ThemeResponse }) {
    return (
        <Link href={`/themes/${room.id}`}>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden cursor-pointer hover:shadow-sm transition-shadow">
                {/* 이미지 섹션 */}
                <div className="relative aspect-[4/3] bg-gray-700 overflow-hidden">
                    <img
                        src={room.thumbnailUrl || '/default-thumbnail.svg'}
                        alt={room.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                    />
                </div>

                <div className="p-5">
                    <h3 className="font-bold text-lg mb-3 truncate text-white">{room.name}</h3>
                    <p className="text-gray-400 text-sm mb-3 truncate">{room.storeName || '미스터리 룸 강남점'}</p>
                    <div className="flex items-center mb-4">
                        <div className="flex items-center text-gray-300 text-sm mr-4">
                            <Image src="/time.svg" alt="시간" width={16} height={16} className="mr-1.5" />
                            <span>{room.runtime ? `${room.runtime}분` : '60분'}</span>
                        </div>
                        <div className="flex items-center text-gray-300 text-sm">
                            <Image src="/members.svg" alt="인원" width={16} height={16} className="mr-1.5" />
                            <span>{room.recommendedParticipants || '2-4인'}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3 h-[24px] overflow-hidden">
                        {(room.tags || ['공포', '추리']).slice(0, 3).map((tag, index) => {
                            // 태그별 배경색과 텍스트 색상 지정
                            let bgColorClass = ''
                            let textColorClass = ''

                            switch (tag) {
                                case '공포':
                                    bgColorClass = 'bg-blue-100'
                                    textColorClass = 'text-blue-700'
                                    break
                                case '추리':
                                    bgColorClass = 'bg-green-100'
                                    textColorClass = 'text-green-700'
                                    break
                                case 'SF':
                                    bgColorClass = 'bg-purple-100'
                                    textColorClass = 'text-purple-700'
                                    break
                                case '액션':
                                    bgColorClass = 'bg-yellow-100'
                                    textColorClass = 'text-yellow-700'
                                    break
                                case '미스터리':
                                    bgColorClass = 'bg-indigo-100'
                                    textColorClass = 'text-indigo-700'
                                    break
                                default:
                                    bgColorClass = 'bg-gray-700'
                                    textColorClass = 'text-gray-300'
                            }

                            return (
                                <span
                                    key={index}
                                    className={`px-3 py-1 ${bgColorClass} ${textColorClass} text-xs rounded-sm truncate max-w-[120px]`}
                                >
                                    {tag}
                                </span>
                            )
                        })}
                        {(room.tags || []).length > 3 && (
                            <span className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-sm">
                                +{(room.tags || []).length - 3}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}
