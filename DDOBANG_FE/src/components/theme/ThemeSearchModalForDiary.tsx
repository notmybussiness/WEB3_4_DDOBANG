'use client'

import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Image from 'next/image'
import { useEffect, useState } from 'react'

type ThemeSearchModalProps = {
    isOpen: boolean
    onClose: () => void
    onSelect: (theme: string, themeId: number) => void
    searchTerm: string
    onSearchTermChange: (term: string) => void
    loading: boolean
    onLoadingChange: (loading: boolean) => void
}

type SimpleThemeResponse = components['schemas']['SimpleThemeResponse']

export function ThemeSearchModal({
    isOpen,
    onClose,
    onSelect,
    searchTerm,
    onSearchTermChange,
    loading,
    onLoadingChange,
}: ThemeSearchModalProps) {
    const [themes, setThemes] = useState<SimpleThemeResponse[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return

        // 모달이 열릴 때 테마 목록 초기화
        const fetchThemes = async () => {
            onLoadingChange(true)
            setError(null)

            try {
                const response = await client.GET('/api/v1/themes/search-for-diary', {
                    params: {
                        query: {
                            keyword: searchTerm,
                        },
                    },
                })
                console.log('테마 검색 결과:', response?.data)

                if (response?.data?.data && response.data.data.length > 0) {
                    setThemes(response.data.data)
                } else {
                    setThemes([])
                }
            } catch (err) {
                console.error('테마 검색 중 오류:', err)
                setError('테마 목록을 불러오는데 실패했습니다.')
                setThemes([])
            } finally {
                onLoadingChange(false)
            }
        }

        fetchThemes()
    }, [isOpen, searchTerm, onLoadingChange])

    const handleThemeSelect = (theme: SimpleThemeResponse) => {
        onSelect(theme.themeName || '', theme.themeId || 0)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">테마 검색</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M18 6L6 18M6 6L18 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                <div className="relative mb-4">
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
                        placeholder="테마명으로 검색"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                </div>

                {loading && (
                    <div className="flex justify-center my-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-black"></div>
                    </div>
                )}

                {error && <div className="text-red-500 text-center my-4">{error}</div>}

                {!loading && themes.length === 0 && (
                    <div className="text-gray-500 text-center my-4">등록된 테마가 없습니다</div>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {themes.map((theme, index) => (
                        <button
                            key={`theme-${theme.themeId || index}`}
                            onClick={() => handleThemeSelect(theme)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                        >
                            <div className="font-medium">{theme.themeName}</div>
                            {theme.storeName && <div className="text-sm text-gray-600">{theme.storeName}</div>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
