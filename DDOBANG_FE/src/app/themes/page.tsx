'use client'

import { PageLoading } from '@/components/common/PageLoading'
import { ThemeCard } from '@/components/theme/ThemeCard'
import { ThemeSearch } from '@/components/theme/ThemeSearch'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { useCallback, useEffect, useRef, useState } from 'react'

type ThemeResponse = components['schemas']['ThemesResponse']

export default function ThemesPage() {
    const [themes, setThemes] = useState<ThemeResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [hasMore, setHasMore] = useState(true)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [selectedFilters, setSelectedFilters] = useState({
        regionId: [] as number[],
        tagIds: [] as number[],
        participants: '',
    })
    const observer = useRef<IntersectionObserver | null>(null)
    const ITEMS_PER_PAGE = 8
    const [filterModalOpen, setFilterModalOpen] = useState(false)
    const [filterSubRegions, setFilterSubRegions] = useState<string[]>([])
    const [filterGenreNames, setFilterGenreNames] = useState<string[]>([])

    // 마지막 요소 관찰을 위한 ref callback
    const lastThemeElementRef = useCallback(
        (node: HTMLDivElement) => {
            if (loading) return
            if (observer.current) observer.current.disconnect()

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMoreThemes(false)
                }
            })

            if (node) observer.current.observe(node)
        },
        [loading, hasMore],
    )

    const loadMoreThemes = async (reset = false) => {
        if (loading || (!hasMore && !reset)) return

        setLoading(true)
        try {
            if (reset) {
                setThemes([])
                setHasMore(true)
            }

            const lastTheme = themes[themes.length - 1]
            const lastId = reset ? undefined : lastTheme?.id

            const response = await client.POST('/api/v1/themes', {
                params: {
                    query: {
                        page: reset ? 0 : themes.length / ITEMS_PER_PAGE,
                        size: ITEMS_PER_PAGE,
                    },
                },
                body: {
                    regionId: selectedFilters.regionId,
                    tagIds: selectedFilters.tagIds,
                    keyword: searchKeyword,
                    participants: selectedFilters.participants
                        ? parseInt(selectedFilters.participants.replace(/[^0-9]/g, ''))
                        : undefined,
                },
            })

            if (response?.data?.data) {
                const apiThemes = response.data.data.content || []
                const hasNext = response.data.data.hasNext || false

                if (apiThemes.length === 0 || apiThemes[0]?.id === lastId) {
                    setHasMore(false)
                } else {
                    setHasMore(hasNext)
                }

                // API 응답에서 받은 테마 데이터를 ThemeResponse 타입으로 변환
                const newThemes = apiThemes.map((theme: ThemeResponse) => ({
                    id: theme.id?.toString(),
                    title: theme.name || '',
                    category: theme.storeName || '',
                    date: '오늘',
                    location: theme.storeName?.split(' ')[0] || '',
                    participants: theme.recommendedParticipants || '2-4인',
                    subInfo: theme.runtime ? `${theme.runtime}분` : '',
                    tags: theme.tags || [],
                    image: theme.thumbnailUrl || '/default-thumbnail.svg',
                    rating: '80',
                }))

                setThemes((prev) => (reset ? newThemes : [...prev, ...newThemes]))
            } else {
                setHasMore(false)
            }
        } catch (error) {
            console.error('테마 목록을 불러오는 중 오류가 발생했습니다:', error)
            setHasMore(false)
        } finally {
            setLoading(false)
            setInitialLoading(false)
        }
    }

    const handleSearch = (keyword: string) => {
        setSearchKeyword(keyword)
        loadMoreThemes(true)
    }

    // 필터 초기화 함수
    const resetAllFilters = async () => {
        console.log('=== 필터 초기화 시작 ===')
        setSearchKeyword('')
        const newFilters = {
            regionId: [],
            tagIds: [],
            participants: '',
        }
        console.log('초기화할 새 필터:', newFilters)
        setSelectedFilters(newFilters)
        setFilterSubRegions([])
        setFilterGenreNames([])

        console.log('ThemeSearch에 전달되는 currentFilters:', {
            regions: [],
            genres: [],
            participant: '',
            subRegions: [],
            genreNames: [],
        })

        // 초기화된 필터로 API 호출
        const response = await client.POST('/api/v1/themes', {
            params: {
                query: {
                    page: 0,
                    size: ITEMS_PER_PAGE,
                },
            },
            body: {
                regionId: [],
                tagIds: [],
                keyword: '',
                participants: undefined,
            },
        })
        console.log('API 요청 body:', {
            regionId: [],
            tagIds: [],
            keyword: '',
            participants: undefined,
        })

        if (response?.data?.data) {
            console.log('API 응답:', response.data.data)
            const apiThemes = response.data.data.content || []
            const hasNext = response.data.data.hasNext || false

            setHasMore(hasNext)
            setThemes(
                apiThemes.map((theme: ThemeResponse) => ({
                    id: theme.id?.toString(),
                    title: theme.name || '',
                    category: theme.storeName || '',
                    date: '오늘',
                    location: theme.storeName?.split(' ')[0] || '',
                    participants: theme.recommendedParticipants || '2-4인',
                    subInfo: theme.runtime ? `${theme.runtime}분` : '',
                    tags: theme.tags || [],
                    image: theme.thumbnailUrl || '/default-thumbnail.svg',
                    rating: '80',
                })),
            )
        }
        console.log('=== 필터 초기화 완료 ===')
    }

    // 특정 필터 제거 함수
    const removeFilter = (filterType: 'keyword' | 'region' | 'genre' | 'participant') => {
        const newFilters = { ...selectedFilters }

        switch (filterType) {
            case 'keyword':
                setSearchKeyword('')
                break
            case 'region':
                newFilters.regionId = []
                setFilterSubRegions([])
                break
            case 'genre':
                newFilters.tagIds = []
                setFilterGenreNames([])
                break
            case 'participant':
                newFilters.participants = ''
                break
        }

        setSelectedFilters(newFilters)

        // 변경된 필터로 API 호출
        client
            .POST('/api/v1/themes', {
                params: {
                    query: {
                        page: 0,
                        size: ITEMS_PER_PAGE,
                    },
                },
                body: {
                    regionId: newFilters.regionId,
                    tagIds: newFilters.tagIds,
                    keyword: filterType === 'keyword' ? '' : searchKeyword,
                    participants: newFilters.participants ? parseInt(newFilters.participants) : undefined,
                },
            })
            .then((response) => {
                if (response?.data?.data) {
                    const apiThemes = response.data.data.content || []
                    const hasNext = response.data.data.hasNext || false

                    setHasMore(hasNext)
                    setThemes(
                        apiThemes.map((theme: ThemeResponse) => ({
                            id: theme.id?.toString(),
                            title: theme.name || '',
                            category: theme.storeName || '',
                            date: '오늘',
                            location: theme.storeName?.split(' ')[0] || '',
                            participants: theme.recommendedParticipants || '2-4인',
                            subInfo: theme.runtime ? `${theme.runtime}분` : '',
                            tags: theme.tags || [],
                            image: theme.thumbnailUrl || '/default-thumbnail.svg',
                            rating: '80',
                        })),
                    )
                }
            })
    }

    const handleFilterApply = async (filters: any) => {
        const newFilters = {
            regionId: Array.isArray(filters.regions) ? filters.regions.map((region: string) => parseInt(region)) : [],
            tagIds: filters.genres || [],
            participants: filters.participant || '',
        }

        setSelectedFilters(newFilters)
        setFilterSubRegions(filters.subRegions || [])
        setFilterGenreNames(filters.genreNames || [])

        // API 호출 시 새로운 필터 값 사용
        const response = await client.POST('/api/v1/themes', {
            params: {
                query: {
                    page: 0,
                    size: ITEMS_PER_PAGE,
                },
            },
            body: {
                regionId: newFilters.regionId,
                tagIds: newFilters.tagIds,
                keyword: searchKeyword,
                participants: newFilters.participants
                    ? parseInt(newFilters.participants.replace(/[^0-9]/g, ''))
                    : undefined,
            },
        })

        if (response?.data?.data) {
            const apiThemes = response.data.data.content || []
            const hasNext = response.data.data.hasNext || false

            setHasMore(hasNext)
            setThemes(
                apiThemes.map((theme: ThemeResponse) => ({
                    id: theme.id?.toString(),
                    title: theme.name || '',
                    category: theme.storeName || '',
                    date: '오늘',
                    location: theme.storeName?.split(' ')[0] || '',
                    participants: theme.recommendedParticipants || '2-4인',
                    subInfo: theme.runtime ? `${theme.runtime}분` : '',
                    tags: theme.tags || [],
                    image: theme.thumbnailUrl || '/default-thumbnail.svg',
                    rating: '80',
                })),
            )
        }
    }

    useEffect(() => {
        loadMoreThemes(true)
    }, [])

    // 스켈레톤 카드 렌더링 함수
    const renderSkeletonCards = () => {
        return Array(8)
            .fill(0)
            .map((_, index) => (
                <div
                    key={`skeleton-${index}`}
                    className="bg-gray-800 rounded-xl shadow-sm overflow-hidden cursor-pointer h-[450px] flex flex-col"
                >
                    {/* 이미지 섹션 */}
                    <div className="relative h-[220px] bg-gray-700 animate-pulse"></div>

                    {/* 내용 섹션 */}
                    <div className="p-5 flex flex-col h-full">
                        <div className="h-6 bg-gray-700 rounded animate-pulse mb-3"></div>
                        <div className="h-5 w-3/4 bg-gray-700 rounded animate-pulse mb-3"></div>
                        <div className="mt-2">
                            <div className="h-4 w-full bg-gray-700 rounded animate-pulse mb-2"></div>
                            <div className="h-4 w-2/3 bg-gray-700 rounded animate-pulse"></div>
                        </div>
                        <div className="mt-auto">
                            <div className="h-5 w-1/2 bg-gray-700 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>
            ))
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <main className="container mx-auto px-4 py-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">방탈출 테마</h1>
                </div>

                <ThemeSearch
                    onSearch={handleSearch}
                    onFilterApply={handleFilterApply}
                    searchTerm={searchKeyword}
                    onSearchTermChange={setSearchKeyword}
                    isFilterModalOpen={filterModalOpen}
                    onFilterModalOpenChange={setFilterModalOpen}
                    filterType="theme"
                    currentFilters={{
                        regions: selectedFilters.regionId.map((id) => id.toString()),
                        genres: selectedFilters.tagIds,
                        participant: selectedFilters.participants,
                        subRegions: filterSubRegions,
                        genreNames: filterGenreNames,
                    }}
                />

                {/* 활성화된 필터 표시 */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {searchKeyword && (
                        <div className="inline-flex items-center px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                            <span>검색어: {searchKeyword}</span>
                            <button onClick={() => removeFilter('keyword')} className="ml-1.5 hover:text-gray-300">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                    {filterSubRegions.length > 0 && (
                        <div className="inline-flex items-center px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                            <span>지역: {filterSubRegions.join(', ')}</span>
                            <button onClick={() => removeFilter('region')} className="ml-1.5 hover:text-gray-300">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                    {filterGenreNames.length > 0 && (
                        <div className="inline-flex items-center px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                            <span>장르: {filterGenreNames.join(', ')}</span>
                            <button onClick={() => removeFilter('genre')} className="ml-1.5 hover:text-gray-300">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                    {selectedFilters.participants && (
                        <div className="inline-flex items-center px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                            <span>인원: {selectedFilters.participants}명</span>
                            <button onClick={() => removeFilter('participant')} className="ml-1.5 hover:text-gray-300">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                    {(searchKeyword ||
                        selectedFilters.regionId.length ||
                        selectedFilters.tagIds.length ||
                        selectedFilters.participants) && (
                        <button
                            onClick={resetAllFilters}
                            className="inline-flex items-center px-2 py-1 bg-black text-white rounded-full text-xs hover:bg-gray-800"
                        >
                            필터 초기화
                        </button>
                    )}
                </div>

                {initialLoading ? (
                    <PageLoading />
                ) : (
                    <div className="mt-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {themes.map((theme, index) => (
                                <div
                                    key={`theme-${theme.id}-${index}`}
                                    ref={index === themes.length - 1 ? lastThemeElementRef : undefined}
                                >
                                    <ThemeCard room={theme} />
                                </div>
                            ))}
                            {loading && renderSkeletonCards()}
                        </div>
                        {themes.length === 0 && !loading && (
                            <div className="w-full my-12">
                                <div className="bg-gray-800 border border-gray-700 rounded-xl py-24 px-8 text-center">
                                    <p className="text-lg font-medium text-gray-400">표시할 테마가 없습니다.</p>
                                    <p className="text-gray-400">다른 검색어나 필터로 시도해보세요.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
