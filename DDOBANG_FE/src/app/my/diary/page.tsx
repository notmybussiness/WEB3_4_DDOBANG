'use client'

import { PageLoading } from '@/components/common/PageLoading'
import { DiarySearch } from '@/components/diary/DiarySearch'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// DiaryListDto 타입 사용
type Diary = components['schemas']['DiaryListDto']

// 필터 타입 정의
interface DiaryFilter {
    keyword: string
    regionId?: number[]
    tagIds?: number[]
    startDate?: string
    endDate?: string
}

// 페이지네이션 타입 정의
interface PaginationInfo {
    totalPages: number
    currentPage: number
    totalElements: number
}

export default function DiaryPage() {
    const router = useRouter()
    const [diaries, setDiaries] = useState<Diary[]>([])
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [filter, setFilter] = useState<DiaryFilter>({ keyword: '' })
    const [appliedFiltersCount, setAppliedFiltersCount] = useState(0)
    const [pagination, setPagination] = useState<PaginationInfo>({
        totalPages: 1,
        currentPage: 1,
        totalElements: 0,
    })
    const searchInputRef = useRef<HTMLInputElement>(null)
    const filterModalRef = useRef<HTMLDivElement>(null)
    const [filterSubRegions, setFilterSubRegions] = useState<string[]>([])
    const [filterGenreNames, setFilterGenreNames] = useState<string[]>([])

    // 검색어 입력 지연 처리를 위한 타이머
    const searchTimer = useRef<NodeJS.Timeout | null>(null)

    // 필터 모달 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterModalRef.current && !filterModalRef.current.contains(event.target as Node)) {
                setIsFilterModalOpen(false)
            }
        }

        if (isFilterModalOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isFilterModalOpen])

    // 초기 데이터 로딩
    useEffect(() => {
        fetchDiaries(1)
    }, [])

    // 검색어 변경 시 API 호출 (디바운스 적용)
    useEffect(() => {
        if (searchTimer.current) {
            clearTimeout(searchTimer.current)
        }

        searchTimer.current = setTimeout(() => {
            const newFilter = { ...filter, keyword: searchKeyword }
            setFilter(newFilter)
            fetchDiaries(1, newFilter)
        }, 300)

        return () => {
            if (searchTimer.current) {
                clearTimeout(searchTimer.current)
            }
        }
    }, [searchKeyword])

    // 필터에 적용된 조건 수 계산
    useEffect(() => {
        let count = 0
        if (filter.regionId && filter.regionId.length > 0) count++
        if (filter.tagIds && filter.tagIds.length > 0) count++
        if (filter.startDate || filter.endDate) count++
        setAppliedFiltersCount(count)
    }, [filter])

    // 일지 목록 조회
    const fetchDiaries = async (page: number, currentFilter: DiaryFilter = filter) => {
        setLoading(true)
        try {
            const response = await client.POST('/api/v1/diaries/list', {
                body: {
                    keyword: currentFilter.keyword,
                    regionIds: currentFilter.regionId,
                    tagIds: currentFilter.tagIds,
                    startDate: currentFilter.startDate,
                    endDate: currentFilter.endDate,
                },
                params: {
                    query: {
                        page: page - 1,
                        pageSize: 12,
                    },
                },
            })

            if (response.data?.data) {
                const { items, totalPages, currentPageNumber, totalItems } = response.data.data

                // DiaryListDto[] 타입으로 명시적 캐스팅
                setDiaries((items || []) as Diary[])
                setPagination({
                    totalPages: totalPages || 1,
                    currentPage: currentPageNumber || 1,
                    totalElements: totalItems || 0,
                })
            } else {
                setDiaries([])
                setPagination({
                    totalPages: 1,
                    currentPage: 1,
                    totalElements: 0,
                })
            }
        } catch (error) {
            console.error('일지 목록을 불러오는 중 오류가 발생했습니다:', error)
            setDiaries([])
        } finally {
            setLoading(false)
            setInitialLoading(false)
        }
    }

    // 검색 핸들러
    const handleSearch = (keyword: string) => {
        setSearchKeyword(keyword)
        const newFilter = { ...filter, keyword }
        setFilter(newFilter)
        fetchDiaries(1, newFilter)
    }

    // 한국어 날짜를 ISO 형식으로 변환하는 함수
    const convertToISODate = (koreanDate: string): string => {
        const [year, month, day] = koreanDate.replace(/\./g, '').split(' ').map(Number)
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    }

    // 필터 적용 핸들러
    const handleFilterApply = (filters: any) => {
        console.log('페이지에서 받은 필터 값:', filters)
        const newFilter = {
            ...filter,
            regionId: filters.regions.map((id: string) => parseInt(id)),
            tagIds: filters.genres,
            startDate: filters.dates[0] ? convertToISODate(filters.dates[0]) : undefined,
            endDate: filters.dates[1] ? convertToISODate(filters.dates[1]) : undefined,
        }

        // 필터 이름들 설정
        setFilterSubRegions(filters.subRegions || [])
        setFilterGenreNames(filters.genreNames || [])

        setFilter(newFilter)
        fetchDiaries(1, newFilter)
    }

    // 페이지 변경 핸들러
    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.totalPages) return

        fetchDiaries(newPage)

        // 스크롤을 상단으로 이동
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // 시간 포맷 헬퍼 함수 (초 -> MM:SS)
    const formatTime = (seconds?: number): string => {
        if (!seconds) return '00:00'

        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    // 날짜 포맷 헬퍼 함수 (YYYY.MM.DD 형식)
    const formatDate = (dateString?: string): string => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date
            .toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            })
            .replace(/\. /g, '.')
            .replace(/\.$/, '')
    }

    // 페이지네이션 렌더링 함수
    const renderPagination = () => {
        const { totalPages, currentPage } = pagination
        if (totalPages <= 1) return null

        // 표시할 페이지 번호 계산 (최대 5개)
        let pageNumbers: number[] = []

        if (totalPages <= 5) {
            // 5페이지 이하면 모든 페이지 표시
            pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
        } else {
            // 5페이지 초과면 현재 페이지 중심으로 표시
            const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
            pageNumbers = Array.from({ length: 5 }, (_, i) => startPage + i)
        }

        return (
            <div className="flex justify-center mt-8">
                <div className="flex items-center gap-1">
                    {/* 이전 버튼 */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`w-8 h-8 flex items-center justify-center rounded-md ${
                            currentPage === 1
                                ? 'text-gray-500 cursor-not-allowed'
                                : 'border border-gray-600 hover:bg-gray-700 text-gray-300'
                        }`}
                    >
                        &lt;
                    </button>

                    {/* 페이지 번호 */}
                    {pageNumbers.map((pageNum) => (
                        <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={pageNum === currentPage}
                            className={`w-8 h-8 flex items-center justify-center rounded-md ${
                                pageNum === currentPage
                                    ? 'bg-[#FFB130] text-white'
                                    : 'border border-gray-600 hover:bg-gray-700 text-gray-300'
                            }`}
                        >
                            {pageNum}
                        </button>
                    ))}

                    {/* 다음 버튼 */}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`w-8 h-8 flex items-center justify-center rounded-md ${
                            currentPage === totalPages
                                ? 'text-gray-500 cursor-not-allowed'
                                : 'border border-gray-600 hover:bg-gray-700 text-gray-300'
                        }`}
                    >
                        &gt;
                    </button>
                </div>
            </div>
        )
    }

    // 스켈레톤 카드 렌더링 함수
    const renderSkeletonCards = () => {
        return Array(4)
            .fill(0)
            .map((_, index) => (
                <div
                    key={`skeleton-${index}`}
                    className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden animate-pulse"
                >
                    <div className="aspect-[4/3] bg-gray-700"></div>
                    <div className="p-5">
                        <div className="h-5 bg-gray-700 rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
                        <div className="flex items-center mb-4 gap-4">
                            <div className="h-4 bg-gray-700 rounded w-16"></div>
                            <div className="h-4 bg-gray-700 rounded w-16"></div>
                        </div>
                        <div className="flex gap-2 mb-3">
                            <div className="h-6 bg-gray-700 rounded w-16"></div>
                            <div className="h-6 bg-gray-700 rounded w-16"></div>
                        </div>
                    </div>
                </div>
            ))
    }

    // 필터 초기화 함수
    const resetAllFilters = () => {
        setSearchKeyword('')
        setFilter({ keyword: '' })
        setFilterSubRegions([])
        setFilterGenreNames([])
        fetchDiaries(1, { keyword: '' })
    }

    // 특정 필터 제거 함수
    const removeFilter = (filterType: 'keyword' | 'region' | 'genre' | 'date') => {
        const newFilter = { ...filter }

        switch (filterType) {
            case 'keyword':
                setSearchKeyword('')
                newFilter.keyword = ''
                break
            case 'region':
                newFilter.regionId = undefined
                setFilterSubRegions([])
                break
            case 'genre':
                newFilter.tagIds = undefined
                setFilterGenreNames([])
                break
            case 'date':
                newFilter.startDate = undefined
                newFilter.endDate = undefined
                break
        }

        setFilter(newFilter)
        fetchDiaries(1, newFilter)
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <main className="container mx-auto px-4 py-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">나의 탈출일지</h1>
                    <Link
                        href="/my/diary/new"
                        className="bg-[#FFB130] text-black px-5 py-2 rounded-full font-medium hover:bg-[#F0A420] transition"
                    >
                        일지 작성하기
                    </Link>
                </div>

                {/* 검색 및 필터 섹션 */}
                <div className="mb-8">
                    <DiarySearch
                        onSearch={handleSearch}
                        searchTerm={searchKeyword}
                        onSearchTermChange={setSearchKeyword}
                        isFilterModalOpen={isFilterModalOpen}
                        onFilterModalOpenChange={setIsFilterModalOpen}
                        currentFilters={{
                            regions: filter.regionId?.map((id) => id.toString()) || [],
                            genres: filter.tagIds || [],
                            dates: [filter.startDate, filter.endDate].filter(Boolean) as string[],
                            subRegions: filterSubRegions,
                            genreNames: filterGenreNames,
                        }}
                        onFilterApply={handleFilterApply}
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
                        {(filter.startDate || filter.endDate) && (
                            <div className="inline-flex items-center px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                                <span>
                                    날짜: {filter.startDate && new Date(filter.startDate).toLocaleDateString()} ~{' '}
                                    {filter.endDate && new Date(filter.endDate).toLocaleDateString()}
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
                            filter.regionId?.length ||
                            filter.tagIds?.length ||
                            filter.startDate ||
                            filter.endDate) && (
                            <button
                                onClick={resetAllFilters}
                                className="inline-flex items-center px-2 py-1 bg-black text-white rounded-full text-xs hover:bg-gray-800"
                            >
                                필터 초기화
                            </button>
                        )}
                    </div>
                </div>

                {/* 전체 페이지 로딩 */}
                <PageLoading isLoading={initialLoading} />

                {!initialLoading && (
                    <div className="max-w-7xl mx-auto">
                        {/* 중단 - 카드 리스트 영역 */}
                        {loading && !initialLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFB130]"></div>
                            </div>
                        ) : diaries.length === 0 ? (
                            <div className="w-full my-12">
                                <div className="bg-gray-800 border border-gray-700 rounded-xl py-24 px-8 text-center">
                                    <p className="text-lg font-medium text-gray-400">등록된 탈출일지가 없습니다</p>
                                    <Link
                                        href="/my/diary/new"
                                        className="mt-4 inline-block px-6 py-2 bg-[#FFB130] text-black rounded-lg hover:bg-[#F0A420]"
                                    >
                                        첫 탈출일지 작성하기
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {diaries.map((diary) => (
                                        <div
                                            key={diary.id}
                                            onClick={() => router.push(`/my/diary/${diary.id}`)}
                                            className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow h-full"
                                        >
                                            {/* 썸네일 영역 */}
                                            <div className="relative aspect-[4/3] bg-gray-700 overflow-hidden">
                                                {diary.thumbnailUrl ? (
                                                    <Image
                                                        src={diary.thumbnailUrl}
                                                        alt={diary.themeName || '테마 이미지'}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-12 w-12"
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
                                                {/* 성공/실패 배지 */}
                                                <div className="absolute top-3 right-3">
                                                    <div
                                                        className={`${
                                                            diary.escapeResult ? 'bg-green-500' : 'bg-red-500'
                                                        } text-white text-xs font-bold px-2 py-1 rounded-full`}
                                                    >
                                                        {diary.escapeResult ? '성공' : '실패'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 컨텐츠 영역 */}
                                            <div className="p-5">
                                                <h3 className="font-bold text-lg mb-3 line-clamp-1 text-white">
                                                    {diary.themeName || '제목 없음'}
                                                </h3>
                                                <p className="text-gray-300 text-sm mb-3">
                                                    {diary.storeName || '매장명 없음'}
                                                </p>
                                                <div className="flex items-center mb-4 gap-4">
                                                    <div className="flex items-center text-gray-300 text-sm">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4 mr-1.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        {formatDate(diary.escapeDate)}
                                                    </div>
                                                    <div className="flex items-center text-gray-300 text-sm">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4 mr-1.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        {formatTime(diary.elapsedTime)}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-gray-400">
                                                            힌트 {diary.hintCount || 0}개
                                                        </span>
                                                    </div>
                                                    {diary.tags && diary.tags.length > 0 && (
                                                        <div className="flex gap-1">
                                                            {diary.tags.map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {loading && !initialLoading && renderSkeletonCards()}
                                </div>
                                {diaries.length === 0 && !loading && (
                                    <div className="w-full my-12">
                                        <div className="bg-gray-800 border border-gray-700 rounded-xl py-24 px-8 text-center">
                                            <p className="text-lg font-medium text-gray-400">등록된 일지가 없습니다</p>
                                        </div>
                                    </div>
                                )}
                                {renderPagination()}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
