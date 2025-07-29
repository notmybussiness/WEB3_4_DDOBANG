'use client'

import { KakaoMap } from '@/components/common/KakaoMap'
import { PageLoading } from '@/components/common/PageLoading'
import { StarRating } from '@/components/stat/StarRating'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type ThemeDetailResponse = components['schemas']['ThemeDetailResponse']

export default function ThemeDetailPage() {
    const params = useParams()
    const router = useRouter()
    const themeId = params.id

    const [themeDetail, setThemeDetail] = useState<ThemeDetailResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchThemeDetail = async () => {
            setLoading(true)
            try {
                const response = await client.GET('/api/v1/themes/{id}', {
                    params: {
                        path: {
                            id: Number(themeId),
                        },
                    },
                })

                if (response?.data?.data) {
                    setThemeDetail(response.data.data)
                } else {
                    throw new Error('응답 데이터가 올바르지 않습니다.')
                }
            } catch (err) {
                console.error('테마 상세 정보 가져오기 오류:', err)
                setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
            } finally {
                setLoading(false)
            }
        }

        if (themeId) {
            fetchThemeDetail()
        }
    }, [themeId])

    const handleSetWishTheme = async () => {
        try {
            await client.POST('/api/v1/themes/{id}/wishes', {
                params: {
                    path: {
                        id: Number(themeId),
                    },
                },
            })
            router.push('/my/profile')
        } catch (error) {
            console.error('희망 테마 설정 에러:', error)
            // 에러 처리 로직 추가
        }
    }

    if (loading) {
        return (
            <main className="bg-gray-900 min-h-screen">
                <PageLoading isLoading={loading} />
            </main>
        )
    }

    if (error || !themeDetail) {
        return (
            <main className="bg-gray-900 min-h-screen">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
                    <div className="bg-gray-800 rounded-2xl p-8 shadow-sm text-center">
                        <h1 className="text-2xl font-bold mb-4 text-white">오류 발생</h1>
                        <p className="text-gray-400 mb-6">{error || '테마 정보를 불러올 수 없습니다.'}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                        >
                            이전 페이지로 돌아가기
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
                {/* 섹션 1: 테마 정보 */}
                <div className="mb-8">
                    <div className="mb-2">
                        <h1 className="text-2xl font-bold mb-1 text-white">{themeDetail.name}</h1>
                        <span className="text-gray-400">{themeDetail.storeInfo?.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span>{themeDetail.runtime || 0}분</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <span>{themeDetail.recommendedParticipants || '2-4인'}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                        {(themeDetail.tags || []).map((tag, index) => {
                            // 태그별 색상 매핑
                            const getTagStyle = (type: string) => {
                                switch (type.toLowerCase()) {
                                    case '미스터리':
                                        return 'bg-purple-900 text-purple-200'
                                    case '추리':
                                        return 'bg-blue-900 text-blue-200'
                                    case '공포':
                                        return 'bg-red-900 text-red-200'
                                    case '액션':
                                        return 'bg-orange-900 text-orange-200'
                                    case 'sf':
                                        return 'bg-cyan-900 text-cyan-200'
                                    case '판타지':
                                        return 'bg-indigo-900 text-indigo-200'
                                    case '어드벤처':
                                        return 'bg-green-900 text-green-200'
                                    case '퍼즐':
                                        return 'bg-yellow-900 text-yellow-200'
                                    default:
                                        return 'bg-gray-700 text-gray-200'
                                }
                            }

                            return (
                                <span
                                    key={index}
                                    className={`inline-block px-3 py-1 text-sm rounded-full ${getTagStyle(tag)}`}
                                >
                                    #{tag}
                                </span>
                            )
                        })}
                    </div>
                    <div className="relative w-full h-[400px] bg-gray-800 rounded-2xl overflow-hidden mb-4">
                        <Image
                            src={themeDetail.thumbnailUrl ?? '/default-thumbnail.svg'}
                            alt={themeDetail.name ?? '테마 이미지'}
                            fill
                            className="object-cover rounded-2xl"
                            priority
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex gap-6">{/* Empty div to maintain layout balance */}</div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">난이도</span>
                                <StarRating rating={themeDetail.officialDifficulty || 0} maxRating={5} />
                            </div>
                            {themeDetail.price && (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400">가격</span>
                                    <span className="font-medium text-white">
                                        {themeDetail.price.toLocaleString()}원
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 섹션 2: 설명 및 위치 */}
                <section className="bg-gray-800 rounded-2xl p-8 mb-8 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-1/2 border-r border-gray-700 pr-8">
                            <h2 className="text-2xl font-bold mb-4 text-white">테마 설명</h2>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                                {themeDetail.description || '테마 설명이 없습니다.'}
                            </p>
                        </div>
                        {themeDetail.storeInfo && (
                            <div className="w-full md:w-1/2">
                                <h2 className="text-2xl font-bold mb-4 text-white">매장 위치</h2>
                                <div className="h-64 bg-gray-700 rounded-lg mb-4 relative">
                                    <KakaoMap
                                        address={themeDetail.storeInfo.address || ''}
                                        storeName={themeDetail.storeInfo.name}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-gray-300">{themeDetail.storeInfo.address}</p>
                                    <p className="text-gray-300">{themeDetail.storeInfo.phoneNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* 섹션 3: 평가 및 통계 */}
                {themeDetail.diaryBasedThemeStat && (
                    <section className="bg-gray-800 rounded-2xl p-8 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* 유저 평가 */}
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-white">유저 평가</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">만족도</span>
                                        <StarRating
                                            rating={themeDetail.diaryBasedThemeStat.satisfaction || 0}
                                            maxRating={5}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">연출</span>
                                        <StarRating
                                            rating={themeDetail.diaryBasedThemeStat.production || 0}
                                            maxRating={5}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">스토리</span>
                                        <StarRating rating={themeDetail.diaryBasedThemeStat.story || 0} maxRating={5} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">문제</span>
                                        <StarRating
                                            rating={themeDetail.diaryBasedThemeStat.question || 0}
                                            maxRating={5}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">인테리어</span>
                                        <StarRating
                                            rating={themeDetail.diaryBasedThemeStat.interior || 0}
                                            maxRating={5}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 플레이 특성 */}
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-white">플레이 특성</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">난이도</span>
                                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-500 rounded-full"
                                                style={{
                                                    width: `${(themeDetail.diaryBasedThemeStat.difficulty || 0) * 20}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">공포도</span>
                                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full"
                                                style={{
                                                    width: `${(themeDetail.diaryBasedThemeStat.fear || 0) * 20}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">활동성</span>
                                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full"
                                                style={{
                                                    width: `${(themeDetail.diaryBasedThemeStat.activity || 0) * 20}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">기믹/장치</span>
                                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{
                                                    width: `${
                                                        (themeDetail.diaryBasedThemeStat.deviceRatio || 0) * 20
                                                    }%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 빈 공간으로 균형 맞추기 */}
                            <div></div>
                        </div>

                        {/* 통계 */}
                        <div className="mt-8 pt-8 border-t border-gray-700">
                            <h2 className="text-2xl font-bold mb-6 text-white">통계</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-gray-700 rounded-lg p-5 text-center">
                                    <div className="text-4xl font-bold mb-2 text-white">
                                        {themeDetail.diaryBasedThemeStat.escapeResult || 0}%
                                    </div>
                                    <div className="text-gray-400">유저 탈출률</div>
                                </div>
                                <div className="bg-gray-700 rounded-lg p-5 text-center">
                                    <div className="text-4xl font-bold mb-2 text-white">
                                        {themeDetail.diaryBasedThemeStat.noHintEscapeRate || 0}%
                                    </div>
                                    <div className="text-gray-400">노힌트 탈출률</div>
                                </div>
                                <div className="bg-gray-700 rounded-lg p-5 text-center">
                                    <div className="text-4xl font-bold mb-2 text-white">
                                        {themeDetail.diaryBasedThemeStat.escapeTimeAvg || 0}개
                                    </div>
                                    <div className="text-gray-400">평균 힌트</div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <div className="mt-8 flex flex-col gap-8">
                    <div className="flex flex-wrap gap-4 w-full px-4">
                        <Link
                            href="/themes"
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#FFB130] text-[#FFB130] rounded-lg hover:bg-[#FFB130] hover:text-white transition-colors whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                            테마 목록으로 돌아가기
                        </Link>
                        <Link
                            href={themeDetail.reservationUrl || '#'}
                            className="flex-1 px-6 py-3 bg-[#FFB130] text-white rounded-lg hover:bg-[#FFA000] transition-colors text-center shadow-sm whitespace-nowrap"
                        >
                            예약하러 가기
                        </Link>
                        <button
                            onClick={handleSetWishTheme}
                            className="flex-1 px-6 py-3 bg-[#FFB130] text-white rounded-lg hover:bg-[#FFA000] transition-colors text-center shadow-sm whitespace-nowrap"
                        >
                            희망 테마 설정
                        </button>
                        <Link
                            href={`/parties/new?themeId=${themeId}&themeName=${encodeURIComponent(
                                themeDetail.name || '',
                            )}`}
                            className="flex-1 px-6 py-3 bg-[#FFB130] text-white rounded-lg hover:bg-[#FFA000] transition-colors text-center shadow-sm whitespace-nowrap"
                        >
                            모임 만들기
                        </Link>
                        <Link
                            href={`/parties?themeId=${themeId}&themeName=${encodeURIComponent(themeDetail.name || '')}`}
                            className="flex-1 px-6 py-3 bg-[#FFB130] text-white rounded-lg hover:bg-[#FFA000] transition-colors text-center shadow-sm whitespace-nowrap"
                        >
                            모임찾기
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
