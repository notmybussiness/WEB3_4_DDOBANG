'use client'

import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'

type PostDetailResponse = components['schemas']['PostDetailResponse']
type InquiryDetail = Omit<PostDetailResponse, 'replies' | 'attachments'> & {
    replies: NonNullable<PostDetailResponse['replies']>
    attachments: NonNullable<PostDetailResponse['attachments']>
}

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [inquiry, setInquiry] = useState<InquiryDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const inquiryId = Number(id)

    useEffect(() => {
        const fetchInquiryDetail = async () => {
            try {
                setIsLoading(true)
                const response = await client.GET('/api/v1/boards/{id}', {
                    params: {
                        path: {
                            id: inquiryId,
                        },
                    },
                })

                if (response.data?.data) {
                    setInquiry(response.data.data as InquiryDetail)
                } else {
                    // TODO: 403 에러
                    setError('접근 권한이 없습니다.')
                }
            } catch (error) {
                console.error('문의 상세 조회 에러:', error)
                setError('문의 내용을 불러오는데 실패했습니다.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchInquiryDetail()
    }, [inquiryId])

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            await client.DELETE('/api/v1/boards/{id}', {
                params: {
                    path: {
                        id: inquiryId,
                    },
                },
            })
            alert('문의가 삭제되었습니다.')
            router.push('/my/inquiry')
        } catch (error) {
            console.error('문의 삭제 에러:', error)
            alert('문의 삭제에 실패했습니다.')
        }
    }

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

    if (!inquiry) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-gray-400">문의를 찾을 수 없습니다.</div>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-900">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* 문의 내용 */}
                <div className="bg-gray-800 rounded-lg shadow-sm mb-6 border border-gray-700">
                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-sm text-gray-400 mb-2 block">
                                    {inquiry.type === 'QNA' && '사이트 이용 문의'}
                                    {inquiry.type === 'REPORT' && '신고'}
                                    {inquiry.type === 'THEME' && '테마 관련'}
                                </span>
                                <h1 className="text-2xl font-bold text-white">{inquiry.title}</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`px-3 py-1 text-sm rounded-full ${
                                        inquiry.replies.length > 0
                                            ? 'bg-green-900 text-green-300'
                                            : 'bg-yellow-900 text-yellow-300'
                                    }`}
                                >
                                    {inquiry.replies.length > 0 ? '답변 완료' : '답변 대기'}
                                </span>
                                {!inquiry.replies.length && (
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/my/inquiry/${inquiryId}/edit`}
                                            className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            수정
                                        </Link>
                                        <button
                                            onClick={handleDelete}
                                            className="px-3 py-1 text-sm text-red-400 hover:text-red-300"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between text-sm text-gray-400">
                                <div>
                                    <span className="font-medium">작성시간</span>
                                    <span className="ml-2">{inquiry.createdAt}</span>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-sm font-medium text-gray-300 mb-2">내용</h2>
                                <p className="text-gray-300 whitespace-pre-wrap">{inquiry.content}</p>
                            </div>

                            {inquiry.attachments.length > 0 && (
                                <div>
                                    <h2 className="text-sm font-medium text-gray-300 mb-2">첨부 파일</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {inquiry.attachments.map((file) => (
                                            <a
                                                key={file.id}
                                                href={`/api/v1/posts/attachment/${file.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                            >
                                                <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-700">
                                                    <Image
                                                        src={`/api/v1/posts/attachment/${file.id}`}
                                                        alt={file.fileName || ''}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 답변 내용 */}
                {inquiry.replies.length > 0 && (
                    <div className="bg-gray-800 rounded-lg shadow-sm mb-6 border border-gray-700">
                        <div className="p-8">
                            <h2 className="text-xl font-bold mb-6 text-white">답변 내용</h2>
                            <div className="space-y-6">
                                {inquiry.replies.map((reply, index) => (
                                    <div key={index} className="space-y-6">
                                        <div className="flex justify-between text-sm text-gray-400">
                                            <div>
                                                <span className="font-medium">내용</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-gray-300 whitespace-pre-wrap">{reply.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 목록으로 버튼 */}
                <Link href="/my/inquiry" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-200">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    목록으로 돌아가기
                </Link>
            </div>
        </main>
    )
}
