'use client'

import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface WishesThemesModalProps {
    isOpen: boolean
    onClose: () => void
}

type ThemeForPartyResponse = components['schemas']['ThemeForPartyResponse']
type SuccessResponseListThemeForPartyResponse = components['schemas']['SuccessResponseListThemeForPartyResponse']

export default function WishesThemesModal({ isOpen, onClose }: WishesThemesModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [themes, setThemes] = useState<ThemeForPartyResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedTheme, setSelectedTheme] = useState<ThemeForPartyResponse | null>(null)

    useEffect(() => {
        if (!isOpen) return

        const fetchThemes = async () => {
            if (!searchQuery) {
                setThemes([])
                return
            }

            setLoading(true)
            setError(null)

            try {
                const response = await client.GET('/api/v1/themes/search-for-party', {
                    params: {
                        query: {
                            keyword: searchQuery,
                        },
                    },
                })

                if (response.data?.data) {
                    setThemes(response.data.data as ThemeForPartyResponse[])
                } else {
                    setThemes([])
                }
            } catch (err) {
                console.error('테마 검색 중 오류:', err)
                setError('테마 목록을 불러오는데 실패했습니다.')
                setThemes([])
            } finally {
                setLoading(false)
            }
        }

        fetchThemes()
    }, [isOpen, searchQuery])

    const handleThemeSelect = (theme: ThemeForPartyResponse) => {
        setSelectedTheme(theme)
    }

    const handleRegisterTheme = async () => {
        if (!selectedTheme) return

        try {
            if (!selectedTheme?.themeId) {
                throw new Error('테마 ID가 없습니다.')
            }

            await client.POST('/api/v1/themes/{id}/wishes', {
                params: {
                    path: {
                        id: selectedTheme.themeId,
                    },
                },
                body: undefined,
            })
            onClose()
        } catch (error) {
            console.error('테마 등록 중 오류:', error)
            setError('테마 등록에 실패했습니다.')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-700 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">테마 찾기</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* 선택된 테마 표시 */}
                    {selectedTheme && (
                        <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-white">{selectedTheme.name}</h3>
                                    <p className="text-sm text-gray-300">{selectedTheme.storeName}</p>
                                    {selectedTheme.tags && selectedTheme.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {selectedTheme.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-1 bg-[#FFB130] text-black text-xs rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedTheme(null)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 검색창 */}
                    <div className="relative">
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
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="테마명으로 검색"
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB130]"
                        />
                    </div>
                </div>

                {/* 내용 영역 */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFB130] mx-auto"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-8">{error}</div>
                    ) : !searchQuery ? (
                        <div className="text-center text-gray-400 py-8">검색어를 입력해주세요</div>
                    ) : themes.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">검색 결과가 없습니다</div>
                    ) : (
                        <div className="space-y-2">
                            {themes.map((theme) => (
                                <button
                                    key={`theme-${theme.themeId}`}
                                    onClick={() => handleThemeSelect(theme)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                                        selectedTheme?.themeId === theme.themeId
                                            ? 'bg-[#FFB130] text-black'
                                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                                    }`}
                                >
                                    <div className="font-medium">{theme.name}</div>
                                    {theme.storeName && <div className="text-sm text-gray-300">{theme.storeName}</div>}
                                    {theme.tags && theme.tags.length > 0 && (
                                        <div className="text-xs text-gray-400 mt-1">{theme.tags.join(', ')}</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 하단 버튼 영역 */}
                <div className="border-t border-gray-700 p-6 flex-shrink-0">
                    <div className="flex justify-end gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleRegisterTheme}
                            className={`px-6 py-2.5 rounded-lg transition-colors ${
                                selectedTheme
                                    ? 'bg-[#FFB130] text-black hover:bg-[#F0A120]'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!selectedTheme}
                        >
                            테마 등록
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
