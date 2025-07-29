'use client'

import { PageLoading } from '@/components/common/PageLoading'
import { PartiesFilterModal } from '@/components/party/PartiesFilterModal'
import { PartyCard } from '@/components/party/PartyCard'
import { PartySearch } from '@/components/party/PartySearch'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { LoginMemberContext } from '@/stores/auth/loginMember'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

type PartySearchCondition = components['schemas']['PartySearchCondition']
type PartySummaryResponse = components['schemas']['PartySummaryResponse']

// API에서 받는 모임 데이터 타입
interface SearchCondition {
    keyword: string
    regionIds: number[]
    dates: string[]
    tagsIds: number[]
}

export default function PartiesPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isLogin } = useContext(LoginMemberContext)
    const [parties, setParties] = useState<PartySummaryResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [filterRegions, setFilterRegions] = useState<string[]>([])
    const [filterSubRegions, setFilterSubRegions] = useState<string[]>([])
    const [filterGenres, setFilterGenres] = useState<string[]>([])
    const [filterGenreNames, setFilterGenreNames] = useState<string[]>([])
    const [filterDates, setFilterDates] = useState<string[]>([])
    const [hasMore, setHasMore] = useState(true)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const observer = useRef<IntersectionObserver | null>(null)
    const ITEMS_PER_PAGE = 30

    // URL 파라미터에서 테마 정보를 읽어와서 초기 검색어 설정
    useEffect(() => {
        const themeName = searchParams.get('themeName')
        const themeId = searchParams.get('themeId')

        if (themeName) {
            setSearchKeyword(themeName)
        }

        if (themeId) {
            // themeId가 있는 경우 해당 테마로 필터링된 검색 조건 생성
            const searchCondition: SearchCondition = {
                keyword: themeName || '',
                regionIds: [],
                dates: [],
                tagsIds: [parseInt(themeId)],
            }
            loadParties(true, searchCondition)
        } else if (!initialLoading) {
            // themeId가 없는 경우에만 일반 검색 조건으로 로드
            loadParties(true)
        }
    }, [searchParams])

    // 마지막 요소 관찰을 위한 ref callback
    const lastPartyElementRef = useCallback(
        (node: HTMLDivElement) => {
            if (loading) return
            if (observer.current) observer.current.disconnect()

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    loadParties(false)
                }
            })

            if (node) observer.current.observe(node)
        },
        [loading, hasMore],
    )

    // 모임 데이터 로드
    const loadParties = async (reset = false, customSearchCondition?: PartySearchCondition) => {
        if (loading || (!hasMore && !reset)) return

        setLoading(true)
        try {
            if (reset) {
                setParties([])
                setHasMore(true)
            }

            const lastParty = parties[parties.length - 1]
            const lastId = reset ? undefined : lastParty?.partyId

            const searchCondition = customSearchCondition || {
                keyword: searchKeyword || '',
                regionIds: filterRegions.length > 0 ? filterRegions.map((id) => parseInt(id)) : [],
                dates: filterDates,
                tagsIds: filterGenres.length > 0 ? filterGenres.map((id) => parseInt(id)) : [],
            }

            const response = await client.POST('/api/v1/parties/search', {
                params: {
                    query: {
                        lastId: lastId,
                        size: ITEMS_PER_PAGE,
                    },
                },
                body: searchCondition,
            })

            if (response?.data?.data) {
                const newParties = response.data.data.content || []
                const hasNext = response.data.data.hasNext || false

                if (newParties.length === 0 || newParties[0]?.partyId === lastId) {
                    setHasMore(false)
                } else {
                    setHasMore(hasNext)
                }

                setParties((prev) => (reset ? newParties : [...prev, ...newParties]))
            }
        } catch (error) {
            console.error('모임 데이터 로드 중 오류 발생:', error)
            setHasMore(false)
        } finally {
            setLoading(false)
            setInitialLoading(false)
        }
    }

    // 초기 데이터 로드
    useEffect(() => {
        if (!searchParams.get('themeId')) {
            loadParties(true)
        }
    }, [])

    // 필터 상태가 변경될 때마다 API 요청
    useEffect(() => {
        if (!initialLoading && !searchParams.get('themeId')) {
            loadParties(true)
        }
    }, [searchKeyword, filterRegions, filterGenres, filterDates])

    // 검색 처리
    const handleSearch = (keyword: string) => {
        setSearchKeyword(keyword)
        loadParties(true) // 검색어가 변경되면 데이터 리셋 후 다시 로드
    }

    // 한국어 날짜를 ISO 형식으로 변환하는 함수
    const convertToISODate = (koreanDate: string): string => {
        const [year, month, day] = koreanDate.replace(/\./g, '').split(' ').map(Number)
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    }

    // 필터 처리
    const handleFilterChange = (filterType: string, value: string) => {
        if (filterType === 'region') {
            setFilterRegions([value])
            loadParties(true)
        }
    }

    // 필터 적용 처리
    const handleFilterApply = (filters: any) => {
        // 지역 필터 처리
        const newRegions = filters.regions || []
        const newSubRegions = filters.subRegions || []
        const newGenres = filters.genres || []
        const newGenreNames = filters.genreNames || []
        const newDates = filters.dates ? filters.dates.map((date: string) => convertToISODate(date)) : []

        // 새로운 검색 조건 생성
        const newSearchCondition: SearchCondition = {
            keyword: searchKeyword || '',
            regionIds: newRegions.map((id: string) => parseInt(id)),
            dates: newDates,
            tagsIds: newGenres.map((id: string) => parseInt(id)),
        }

        // 상태 업데이트와 API 요청
        Promise.all([
            setFilterRegions(newRegions),
            setFilterSubRegions(newSubRegions),
            setFilterGenres(newGenres),
            setFilterGenreNames(newGenreNames),
            setFilterDates(newDates),
        ]).then(() => {
            loadParties(true, newSearchCondition)
        })
    }

    // 카드 클릭 처리
    const handleCardClick = (party: PartySummaryResponse) => {
        if (party?.partyId) {
            router.push(`/parties/${party.partyId}`)
        }
    }

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

    const renderPartyCard = (party: PartySummaryResponse, index: number) => {
        return (
            <div
                key={`party-${party.partyId}-${index}`}
                onClick={() => handleCardClick(party)}
                className="cursor-pointer"
            >
                <PartyCard party={party} />
            </div>
        )
    }

    // 필터 초기화 함수
    const resetAllFilters = () => {
        setSearchKeyword('')
        setFilterRegions([])
        setFilterSubRegions([])
        setFilterGenres([])
        setFilterGenreNames([])
        setFilterDates([])

        // 모든 필터가 초기화된 상태로 API 요청
        const emptySearchCondition: SearchCondition = {
            keyword: '',
            regionIds: [],
            dates: [],
            tagsIds: [],
        }
        loadParties(true, emptySearchCondition)
    }

    // 특정 필터만 제거하는 함수
    const removeFilter = (filterType: 'keyword' | 'region' | 'genre' | 'date') => {
        const currentSearchCondition: SearchCondition = {
            keyword: searchKeyword || '',
            regionIds: filterRegions.length > 0 ? filterRegions.map((id: string) => parseInt(id)) : [],
            dates: filterDates,
            tagsIds: filterGenres.length > 0 ? filterGenres.map((id: string) => parseInt(id)) : [],
        }

        switch (filterType) {
            case 'keyword':
                setSearchKeyword('')
                currentSearchCondition.keyword = ''
                break
            case 'region':
                setFilterRegions([])
                setFilterSubRegions([])
                currentSearchCondition.regionIds = []
                break
            case 'genre':
                setFilterGenres([])
                setFilterGenreNames([])
                currentSearchCondition.tagsIds = []
                break
            case 'date':
                setFilterDates([])
                currentSearchCondition.dates = []
                break
        }

        loadParties(true, currentSearchCondition)
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <main className="container mx-auto px-4 py-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">모임 목록</h1>
                    {isLogin && (
                        <Link
                            href="/parties/new"
                            className="bg-black text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition"
                        >
                            모임 만들기
                        </Link>
                    )}
                </div>

                {/* 검색 및 필터 섹션 */}
                <div className="space-y-3">
                    <PartySearch
                        onSearch={handleSearch}
                        onFilterChange={handleFilterChange}
                        onFilterApply={handleFilterApply}
                        searchTerm={searchKeyword}
                        onSearchTermChange={setSearchKeyword}
                        isFilterModalOpen={isFilterModalOpen}
                        onFilterModalOpenChange={setIsFilterModalOpen}
                        currentFilters={{
                            regions: filterRegions,
                            genres: filterGenres.map((id) => parseInt(id)),
                            dates: filterDates,
                            subRegions: filterSubRegions,
                            genreNames: filterGenreNames,
                        }}
                    />

                    {/* 활성화된 필터 표시 */}
                    <div className="flex flex-wrap gap-2">
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
                        {filterDates.length > 0 && (
                            <div className="inline-flex items-center px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                                <span>
                                    날짜: {filterDates.map((date) => new Date(date).toLocaleDateString()).join(', ')}
                                </span>
                                <button onClick={() => removeFilter('date')} className="ml-1.5 hover:text-gray-300">
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
                            filterRegions.length > 0 ||
                            filterGenres.length > 0 ||
                            filterDates.length > 0) && (
                            <button
                                onClick={resetAllFilters}
                                className="inline-flex items-center px-2 py-1 bg-black text-white rounded-full text-xs hover:bg-gray-800"
                            >
                                필터 초기화
                            </button>
                        )}
                    </div>
                </div>

                <PartiesFilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleFilterApply}
                    currentFilters={{
                        regions: filterRegions,
                        genres: filterGenres.map((id) => parseInt(id)),
                        dates: filterDates,
                        subRegions: filterSubRegions,
                        genreNames: filterGenreNames,
                    }}
                />

                {initialLoading ? (
                    <PageLoading />
                ) : (
                    <div className="mt-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {parties.map((party, index) => (
                                <div
                                    key={`party-${party.partyId}-${index}`}
                                    ref={index === parties.length - 1 ? lastPartyElementRef : undefined}
                                >
                                    {renderPartyCard(party, index)}
                                </div>
                            ))}
                            {loading && renderSkeletonCards()}
                        </div>
                        {parties.length === 0 && !loading && (
                            <div className="w-full my-12">
                                <div className="bg-gray-800 border border-gray-700 rounded-xl py-24 px-8 text-center">
                                    <p className="text-lg font-medium text-gray-400">등록된 모임이 없습니다.</p>
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
