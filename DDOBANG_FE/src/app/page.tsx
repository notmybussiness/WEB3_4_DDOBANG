'use client'

import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Autoplay, Navigation as SwiperNavigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

// 테마 태그 목록
const tags = ['#전체', '#공포', '#추리', '#액션', '#판타지', '#SF']

// 테마 타입 정의
type Theme = components['schemas']['ThemesResponse']

// 모임 타입 정의
type Party = components['schemas']['PartyMainResponse']

// 날짜 계산 함수
const getPartyStatus = (scheduledAt: string | undefined) => {
    if (!scheduledAt) return null
    try {
        const date = new Date(scheduledAt)
        const now = new Date()
        const timeDiff = date.getTime() - now.getTime()
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

        if (daysDiff === 0) return '오늘마감'
        if (daysDiff === 1) return 'D-1'
        if (daysDiff < 0) return '마감'
        return `D-${daysDiff}`
    } catch {
        return null
    }
}

export default function HomePage() {
    // 상태 관리
    const [popularActiveTag, setPopularActiveTag] = useState('#전체')
    const [newActiveTag, setNewActiveTag] = useState('#전체')
    const [rankingThemes, setRankingThemes] = useState<Theme[]>([])
    const [newThemes, setNewThemes] = useState<Theme[]>([])
    const [parties, setParties] = useState<Party[]>([])
    const [isLoadingRanking, setIsLoadingRanking] = useState(false)
    const [isLoadingNew, setIsLoadingNew] = useState(false)
    const [isLoadingParties, setIsLoadingParties] = useState(false)

    // 컴포넌트 마운트 시 API 호출
    useEffect(() => {
        fetchRankingThemes()
        fetchNewThemes()
        fetchParties()
    }, [])

    // 인기 테마 태그 선택 시 API 호출
    useEffect(() => {
        fetchRankingThemes(popularActiveTag)
    }, [popularActiveTag])

    // 신규 테마 태그 선택 시 API 호출
    useEffect(() => {
        fetchNewThemes(newActiveTag)
    }, [newActiveTag])

    // 랭킹 테마 가져오기
    const fetchRankingThemes = async (tag?: string) => {
        setIsLoadingRanking(true)
        try {
            const tagName = tag === '#전체' ? '' : tag ? tag.substring(1) : ''
            const response = await client.GET('/api/v1/themes/popular', {
                params: {
                    query: {
                        tagName,
                    },
                },
            })
            setRankingThemes(response.data?.data ?? [])
        } catch (error) {
            console.error('랭킹 테마 조회 실패:', error)
            setRankingThemes([])
        } finally {
            setIsLoadingRanking(false)
        }
    }

    // 신규 테마 가져오기
    const fetchNewThemes = async (tag?: string) => {
        setIsLoadingNew(true)
        try {
            const tagName = tag === '#전체' ? '' : tag ? tag.substring(1) : ''
            const response = await client.GET('/api/v1/themes/newest', {
                params: {
                    query: {
                        tagName,
                    },
                },
            })
            setNewThemes(response.data?.data ?? [])
        } catch (error) {
            console.error('신규 테마 조회 실패:', error)
            setNewThemes([])
        } finally {
            setIsLoadingNew(false)
        }
    }

    // 실시간 모집 파티 가져오기
    const fetchParties = async () => {
        setIsLoadingParties(true)
        try {
            const response = await client.GET('/api/v1/parties/main')
            if (response.data?.data) {
                setParties(response.data.data)
            } else {
                console.warn('모임 데이터가 없습니다.')
                setParties([])
            }
        } catch (error) {
            console.error('모임 조회 실패:', error)
            setParties([])
        } finally {
            setIsLoadingParties(false)
        }
    }

    // 테마 스켈레톤 UI
    const ThemeSkeleton = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
                <div key={index} className="relative">
                    <div className="aspect-[3/4] bg-gray-700 rounded-lg animate-pulse">
                        <div className="absolute top-4 left-4 h-6 w-12 bg-gray-600 rounded-lg animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="h-6 w-3/4 bg-gray-600 rounded mb-2 animate-pulse"></div>
                            <div className="h-4 w-1/2 bg-gray-600 rounded mb-2 animate-pulse"></div>
                            <div className="flex gap-2">
                                <div className="h-4 w-16 bg-gray-600 rounded animate-pulse"></div>
                                <div className="h-4 w-16 bg-gray-600 rounded animate-pulse"></div>
                                <div className="h-4 w-16 bg-gray-600 rounded animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )

    // 테마 없음 컴포넌트
    const EmptyState = () => (
        <div className="text-center py-12 min-h-[400px] flex items-center justify-center">
            <p className="text-gray-400">해당 태그의 테마가 없습니다.</p>
        </div>
    )

    return (
        <main className="min-h-screen bg-gray-900">
            {/* Section 1: 메인 배너 */}
            <section className="w-full h-[450px] relative bg-gray-800">
                <div className="max-w-7xl mx-auto h-full relative flex flex-col items-center justify-start text-center pt-20">
                    <Image src="/logo.svg" alt="또방 로고" width={250} height={100} priority className="mb-6" />
                    <h1 className="text-white text-3xl font-bold">방탈출 메이트 찾기, 또방</h1>
                    <p className="text-gray-300 text-lg font-bold mt-4 max-w-2xl">
                        함께 방탈출할 메이트를 찾고 계신가요?
                        <br />
                        또방과 함께 방탈출 크루를 만들어보세요
                    </p>
                </div>
            </section>

            {/* Section 2: 마감 임박 모임 */}
            <section className="py-12 bg-gray-900">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-8 text-white">마감 임박 모임</h2>

                    <div className="relative">
                        <Swiper
                            modules={[Autoplay, SwiperNavigation]}
                            spaceBetween={20}
                            slidesPerView={1}
                            centeredSlides={false}
                            autoplay={{
                                delay: 5000,
                                disableOnInteraction: false,
                                pauseOnMouseEnter: true,
                            }}
                            navigation={{
                                nextEl: '.swiper-button-next',
                                prevEl: '.swiper-button-prev',
                            }}
                            breakpoints={{
                                640: {
                                    slidesPerView: 2,
                                },
                                768: {
                                    slidesPerView: 3,
                                },
                                1024: {
                                    slidesPerView: 4,
                                },
                            }}
                            className="py-4"
                        >
                            {isLoadingParties
                                ? // 스켈레톤 UI
                                  [...Array(4)].map((_, index) => (
                                      <SwiperSlide key={`skeleton-${index}`} className="p-1 h-full">
                                          <div className="rounded-lg overflow-hidden h-full flex flex-col bg-gray-800 border border-gray-700">
                                              <div className="p-5 flex flex-col h-full">
                                                  <div className="flex items-center justify-between mb-3">
                                                      <div className="h-4 w-20 bg-gray-700 rounded animate-pulse"></div>
                                                      <div className="h-4 w-12 bg-gray-700 rounded animate-pulse"></div>
                                                  </div>

                                                  <div className="h-40 bg-gray-700 rounded-lg mb-3 flex-shrink-0 animate-pulse"></div>

                                                  <div className="h-14">
                                                      <div className="h-5 bg-gray-700 rounded animate-pulse mb-2"></div>
                                                      <div className="h-5 w-3/4 bg-gray-700 rounded animate-pulse"></div>
                                                  </div>
                                                  <div className="h-6">
                                                      <div className="h-4 w-1/2 bg-gray-700 rounded animate-pulse"></div>
                                                  </div>

                                                  <div className="flex items-center mt-auto">
                                                      <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
                                                      <div className="mx-2"></div>
                                                      <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                                                  </div>
                                              </div>
                                          </div>
                                      </SwiperSlide>
                                  ))
                                : parties.map((party, index) => (
                                      <SwiperSlide key={party.id} className="p-1 h-full">
                                          <Link
                                              href={`/parties/${party.id}`}
                                              className={`rounded-lg overflow-hidden transition-all h-full flex flex-col bg-gray-800 border border-gray-700`}
                                          >
                                              <div className="p-5 flex flex-col h-full">
                                                  <div className="flex items-center justify-between mb-3">
                                                      <div className="text-gray-300 text-sm">{party.storeName}</div>
                                                      <div className="text-red-500 text-sm font-medium">
                                                          {getPartyStatus(party.scheduledAt)}
                                                      </div>
                                                  </div>

                                                  <div className="flex justify-center items-center h-40 bg-gray-700 rounded-lg mb-3 flex-shrink-0 relative overflow-hidden">
                                                      {party.themeThumbnailUrl ? (
                                                          <Image
                                                              src={party.themeThumbnailUrl}
                                                              alt="모임 썸네일"
                                                              fill
                                                              className="object-cover"
                                                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                          />
                                                      ) : (
                                                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-600 text-gray-400">
                                                              <svg
                                                                  xmlns="http://www.w3.org/2000/svg"
                                                                  className="h-8 w-8"
                                                                  fill="none"
                                                                  viewBox="0 0 24 24"
                                                                  stroke="currentColor"
                                                              >
                                                                  <path
                                                                      strokeLinecap="round"
                                                                      strokeLinejoin="round"
                                                                      strokeWidth={2}
                                                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                                                                  />
                                                              </svg>
                                                          </div>
                                                      )}
                                                  </div>

                                                  <div className="h-14">
                                                      <h3 className="font-medium text-lg line-clamp-2 h-full text-white">
                                                          {party.title}
                                                      </h3>
                                                  </div>
                                                  <div className="h-6">
                                                      <p className="text-gray-400 text-sm line-clamp-1">
                                                          {party.themeName}
                                                      </p>
                                                  </div>

                                                  <div className="flex items-center text-gray-400 text-sm mt-auto">
                                                      <span>
                                                          {party.acceptedParticipantCount}/{party.totalParticipants}명
                                                      </span>
                                                      <span className="mx-2">•</span>
                                                      {party.scheduledAt && (
                                                          <span>
                                                              {new Date(party.scheduledAt).toLocaleString('ko-KR', {
                                                                  year: 'numeric',
                                                                  month: '2-digit',
                                                                  day: '2-digit',
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                                  hour12: false,
                                                              })}
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                          </Link>
                                      </SwiperSlide>
                                  ))}
                        </Swiper>

                        {/* 커스텀 네비게이션 버튼 */}
                        <div className="swiper-button-next !text-[#FFB130] !right-[-20px] md:!hidden"></div>
                        <div className="swiper-button-prev !text-[#FFB130] !left-[-20px] md:!hidden"></div>

                        {/* 더보기 버튼 */}
                        <div className="flex justify-center mt-8">
                            <Link
                                href="/parties"
                                className="px-6 py-2 border border-[#FFB130] text-[#FFB130] rounded-full hover:bg-[#FFB130] hover:text-white transition-colors"
                            >
                                더보기
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: 인기테마 */}
            <section className="py-12 bg-gray-800">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-8 text-white">인기 테마</h2>
                    <div className="flex justify-center gap-4 mb-8 flex-wrap">
                        {tags.map((tag) => (
                            <button
                                key={tag}
                                className={`px-4 py-2 rounded-full text-sm ${
                                    popularActiveTag === tag
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                                onClick={() => setPopularActiveTag(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[400px]">
                        {isLoadingRanking ? (
                            <ThemeSkeleton />
                        ) : rankingThemes.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div className="relative">
                                <Swiper
                                    modules={[Autoplay, SwiperNavigation]}
                                    spaceBetween={20}
                                    slidesPerView={1}
                                    centeredSlides={false}
                                    autoplay={{
                                        delay: 3000,
                                        disableOnInteraction: false,
                                        pauseOnMouseEnter: true,
                                    }}
                                    navigation
                                    breakpoints={{
                                        640: {
                                            slidesPerView: 2,
                                        },
                                        768: {
                                            slidesPerView: 3,
                                        },
                                        1024: {
                                            slidesPerView: 4,
                                        },
                                    }}
                                    className="py-4"
                                >
                                    {rankingThemes.map((theme, index) => (
                                        <SwiperSlide key={theme.id}>
                                            <Link href={`/themes/${theme.id}`} className="relative block group h-full">
                                                <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative">
                                                    {theme.thumbnailUrl && (
                                                        <Image
                                                            src={theme.thumbnailUrl}
                                                            alt={theme.name ?? '테마 이미지'}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    )}

                                                    {/* 랭킹 뱃지 */}
                                                    <div className="absolute top-4 left-4">
                                                        <span className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                                                            {index + 1}위
                                                        </span>
                                                    </div>

                                                    {/* 오버레이 정보 */}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                                                        <h3 className="font-medium mb-1 text-lg">{theme.name}</h3>
                                                        <p className="text-sm">{theme.storeName}</p>
                                                        <div className="flex items-center mt-2 text-xs">
                                                            <span>{theme.runtime ? `${theme.runtime}분` : '60분'}</span>
                                                            <span className="mx-2">•</span>
                                                            <span>{theme.recommendedParticipants || '2-4인'}</span>
                                                            <span className="mx-2">•</span>
                                                            <span>
                                                                {theme.tags?.[0] || popularActiveTag.replace('#', '')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>

                                {/* 인기 테마 더보기 버튼 */}
                                <div className="flex justify-center mt-8">
                                    <Link
                                        href="/themes"
                                        className="px-6 py-2 border border-orange-500 text-orange-500 rounded-full hover:bg-orange-500 hover:text-white transition-colors"
                                    >
                                        더보기
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Section 4: 신규 테마 */}
            <section className="py-12 bg-gray-900">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-8 text-white">신규 테마</h2>

                    {/* 태그 필터 */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {tags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setNewActiveTag(tag)}
                                className={`px-4 py-2 rounded-full transition-colors ${
                                    newActiveTag === tag
                                        ? 'bg-[#FFB130] text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* 테마 그리드 */}
                    {isLoadingNew ? (
                        <ThemeSkeleton />
                    ) : newThemes.length > 0 ? (
                        <div className="relative">
                            <Swiper
                                modules={[Autoplay, SwiperNavigation]}
                                spaceBetween={20}
                                slidesPerView={1}
                                centeredSlides={false}
                                autoplay={{
                                    delay: 3000,
                                    disableOnInteraction: false,
                                    pauseOnMouseEnter: true,
                                }}
                                navigation
                                breakpoints={{
                                    640: {
                                        slidesPerView: 2,
                                    },
                                    768: {
                                        slidesPerView: 3,
                                    },
                                    1024: {
                                        slidesPerView: 4,
                                    },
                                }}
                                className="py-4"
                            >
                                {newThemes.map((theme, index) => (
                                    <SwiperSlide key={theme.id}>
                                        <Link href={`/themes/${theme.id}`} className="relative block group h-full">
                                            <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative">
                                                {theme.thumbnailUrl && (
                                                    <Image
                                                        src={theme.thumbnailUrl}
                                                        alt={theme.name ?? '테마 이미지'}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                )}

                                                {/* 랭킹 뱃지 */}
                                                <div className="absolute top-4 left-4">
                                                    <span className="bg-[#FFB130] text-white px-3 py-1 rounded-lg text-sm font-bold">
                                                        {index + 1}위
                                                    </span>
                                                </div>

                                                {/* 오버레이 정보 */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                                                    <h3 className="font-medium mb-1 text-lg">{theme.name}</h3>
                                                    <p className="text-sm">{theme.storeName}</p>
                                                    <div className="flex items-center mt-2 text-xs">
                                                        <span>{theme.runtime ? `${theme.runtime}분` : '60분'}</span>
                                                        <span className="mx-2">•</span>
                                                        <span>{theme.recommendedParticipants || '2-4인'}</span>
                                                        <span className="mx-2">•</span>
                                                        <span>{theme.tags?.[0] || newActiveTag.replace('#', '')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    ) : (
                        <EmptyState />
                    )}
                </div>
            </section>
        </main>
    )
}
