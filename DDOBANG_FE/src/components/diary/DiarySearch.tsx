'use client'

import Image from 'next/image'
import Link from 'next/link'
import { DiaryFilterModal } from './DiaryFilterModal'

interface FilterValues {
    regions: string[]
    genres: number[]
    dates: string[]
    subRegions: string[]
    genreNames: string[]
}

interface DiarySearchProps {
    showCreateButton?: boolean
    onSearch?: (keyword: string) => void
    onFilterApply?: (filters: FilterValues) => void
    onFilterChange?: (filterType: string, value: string) => void
    filterType?: 'theme' | 'party'
    searchTerm: string
    onSearchTermChange: (term: string) => void
    isFilterModalOpen: boolean
    onFilterModalOpenChange: (isOpen: boolean) => void
    currentFilters?: FilterValues
}

export function DiarySearch({
    showCreateButton = false,
    onSearch,
    onFilterApply,
    onFilterChange,
    filterType = 'theme',
    searchTerm,
    onSearchTermChange,
    isFilterModalOpen,
    onFilterModalOpenChange,
    currentFilters,
}: DiarySearchProps) {
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (onSearch) {
            onSearch(searchTerm)
        }
    }

    const handleFilterApply = (filters: FilterValues) => {
        if (onFilterApply) {
            onFilterApply(filters)
        }

        // 이전 버전과의 호환성을 위해 onFilterChange도 호출
        if (onFilterChange && filters.regions && filters.regions.length > 0) {
            onFilterChange('region', filters.regions[0])
        }

        onFilterModalOpenChange(false)
    }

    return (
        <div className="w-full mb-6">
            <div className="flex justify-between items-center gap-3">
                <div className="flex-1">
                    <form onSubmit={handleSearch} className="relative">
                        <div className="absolute left-4 top-[14px] pointer-events-none">
                            <Image
                                src="/placeholder_search.svg"
                                alt="검색"
                                width={16}
                                height={16}
                                className="text-gray-400"
                            />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                            placeholder="테마 이름으로 검색"
                            className="w-full pl-9 pr-4 py-2.5 h-10 border border-gray-700 rounded-lg focus:outline-none focus:border-gray-700 placeholder:text-gray-400 text-white bg-gray-800"
                        />
                    </form>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onFilterModalOpenChange(true)}
                        className="px-4 h-10 bg-black text-white text-sm rounded-lg hover:bg-gray-800 flex items-center gap-1.5"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-white"
                        >
                            <path
                                d="M9 15C12.3137 15 15 12.3137 15 9C15 5.68629 12.3137 3 9 3C5.68629 3 3 5.68629 3 9C3 12.3137 5.68629 15 9 15Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M13 13L18 18"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        검색필터
                    </button>
                    {showCreateButton && (
                        <Link
                            href="/parties/new"
                            className="px-4 h-10 flex items-center bg-black text-white text-sm rounded-lg hover:bg-gray-800"
                        >
                            모임 등록
                        </Link>
                    )}
                </div>
            </div>

            <DiaryFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => onFilterModalOpenChange(false)}
                onApply={handleFilterApply}
                currentFilters={currentFilters}
            />
        </div>
    )
}
