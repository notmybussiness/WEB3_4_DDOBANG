'use client'

import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// 타입 정의
type Inquiry = components['schemas']['PostSummaryResponse']

export default function InquiryPage() {
    const [searchKeyword, setSearchKeyword] = useState('')
    const [inquiryType, setInquiryType] = useState<'ALL' | 'QNA' | 'REPORT' | 'THEME'>('ALL')
    const [inquiries, setInquiries] = useState<Inquiry[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    // 문의 목록 조회
    const fetchInquiries = async () => {
        try {
            setIsLoading(true)
            const response = await client.GET('/api/v1/boards', {
                params: {
                    query: {
                        page: currentPage - 1,
                        size: 10,
                        type: inquiryType === 'ALL' ? undefined : inquiryType,
                        keyword: searchKeyword || undefined,
                    },
                },
            })

            console.log('API Response:', response.data)

            if (response.data && response.data.data) {
                const { items, totalPages, currentPageNumber } = response.data.data
                setInquiries(items || [])
                setTotalPages(totalPages || 1)
                setCurrentPage(currentPageNumber || 1)
            } else {
                setInquiries([])
                setTotalPages(1)
            }
        } catch (error) {
            console.error('문의 목록 로딩 에러:', error)
            setError('문의 목록을 불러오는데 실패했습니다.')
            setInquiries([])
            setTotalPages(1)
        } finally {
            setIsLoading(false)
        }
    }

    // 검색 조건이나 페이지가 변경될 때 목록 다시 조회
    useEffect(() => {
        fetchInquiries()
    }, [currentPage, inquiryType, searchKeyword])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-200"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-red-400">{error}</div>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2 text-white">1:1 문의</h1>
                    <p className="text-gray-400">문의사항을 남겨주세요. 최대한 빠르게 답변드리도록 하겠습니다.</p>
                </div>

                {/* 검색 및 문의하기 */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <select
                            className="px-4 py-2 border border-gray-700 rounded-lg mr-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600 bg-gray-800 text-gray-200"
                            value={inquiryType}
                            onChange={(e) => setInquiryType(e.target.value as 'ALL' | 'QNA' | 'REPORT' | 'THEME')}
                        >
                            <option value="ALL">전체</option>
                            <option value="QNA">사이트 이용 문의</option>
                            <option value="REPORT">신고</option>
                            <option value="THEME">테마 관련</option>
                        </select>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="검색어를 입력하세요"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        setCurrentPage(1)
                                        fetchInquiries()
                                    }
                                }}
                                className="pl-4 pr-10 py-2 border border-gray-700 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-gray-600 bg-gray-800 text-gray-200"
                            />
                            <button
                                onClick={() => {
                                    setCurrentPage(1)
                                    fetchInquiries()
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <Link
                        href="/my/inquiry/new"
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 flex items-center border border-gray-700"
                    >
                        새 문의하기
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </Link>
                </div>

                {/* 문의 목록 */}
                <div className="w-full">
                    <div className="grid bg-gray-800 grid-cols-12 text-sm text-white border-y border-gray-700 py-4 px-4">
                        <div className="col-span-1 text-center">번호</div>
                        <div className="col-span-2">분류</div>
                        <div className="col-span-4">제목</div>
                        <div className="col-span-2 text-center">첨부파일</div>
                        <div className="col-span-2 text-center">작성일</div>
                        <div className="col-span-1 text-center">상태</div>
                    </div>

                    {inquiries.length > 0 ? (
                        inquiries.map((inquiry) => (
                            <div
                                key={inquiry.id}
                                onClick={() => router.push(`/my/inquiry/${inquiry.id}`)}
                                className="grid grid-cols-12 text-sm border-b border-gray-700 py-4 px-4 hover:bg-gray-800 cursor-pointer text-gray-300"
                            >
                                <div className="col-span-1 text-center">{inquiry.id}</div>
                                <div className="col-span-2">{inquiry.type}</div>
                                <div className="col-span-4">{inquiry.title}</div>
                                <div className="col-span-2 text-center">{inquiry.hasAttachments ? '있음' : '없음'}</div>
                                <div className="col-span-2 text-center">
                                    {new Date(inquiry.createdAt).toLocaleDateString()}
                                </div>
                                <div className="col-span-1 text-center">
                                    <span
                                        className={`inline-block px-2 py-1 rounded-full text-xs
                      ${inquiry.answered ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}
                                    >
                                        {inquiry.answered ? '답변완료' : '대기중'}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400 bg-gray-800 border-b border-gray-700">
                            문의 내역이 없습니다.
                        </div>
                    )}
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex justify-center mt-8 gap-1">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center border border-gray-700 rounded hover:bg-gray-800 disabled:opacity-50 text-gray-300"
                        >
                            &lt;
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 flex items-center justify-center rounded
                  ${
                      page === currentPage
                          ? 'bg-gray-700 text-white'
                          : 'border border-gray-700 hover:bg-gray-800 text-gray-300'
                  }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 flex items-center justify-center border border-gray-700 rounded hover:bg-gray-800 disabled:opacity-50 text-gray-300"
                        >
                            &gt;
                        </button>
                    </div>
                )}
            </div>
        </main>
    )
}
