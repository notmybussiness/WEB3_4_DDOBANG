'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import client from '@/lib/backend/client'

// 문의 유형 enum
enum PostType {
    QNA = 'QNA', // 사이트 이용 문의
    REPORT = 'REPORT', // 신고
    THEME = 'THEME', // 테마 관련
}

// 문의 유형 매핑
const inquiryTypeMap = {
    '사이트 이용 문의': PostType.QNA,
    신고: PostType.REPORT,
    '테마 관련': PostType.THEME,
}

const inquiryTypes = ['사이트 이용 문의', '신고', '테마 관련']

export default function NewInquiryPage() {
    const router = useRouter()
    const [inquiryType, setInquiryType] = useState('')
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            const validFiles = selectedFiles.filter((file) => {
                const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)
                const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
                return isValidType && isValidSize
            })

            if (validFiles.length !== selectedFiles.length) {
                alert('일부 파일이 업로드되지 않았습니다. (10MB 이하의 JPG, PNG, GIF 파일만 가능)')
            }

            setFiles(validFiles)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!inquiryType || !title || !content) {
            setError('모든 필수 항목을 입력해주세요.')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)

            // 1. 문의 등록
            const postResponse = await client.POST('/api/v1/boards', {
                body: {
                    type: inquiryTypeMap[inquiryType as keyof typeof inquiryTypeMap],
                    title,
                    content,
                    attachments: [], // 초기에는 빈 배열로 보냄
                },
            })

            if (!postResponse.data?.data?.id) {
                throw new Error('문의 등록에 실패했습니다.')
            }

            const postId = postResponse.data.data.id

            // 2. 파일이 있는 경우 첨부파일 업로드
            if (files.length > 0) {
                const formData = new FormData()
                files.forEach((file) => {
                    formData.append('files', file)
                })

                await client.POST('/api/v1/upload/attachment/{postId}', {
                    params: {
                        path: {
                            postId,
                        },
                    },
                    body: formData,
                })
            }

            router.push('/my/inquiry')
        } catch (error) {
            console.error('문의 등록 에러:', error)
            setError('문의 등록에 실패했습니다. 다시 시도해주세요.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="min-h-screen bg-gray-900">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-8 text-white">문의하기</h1>
                <p className="text-gray-400 mb-8">아래 양식을 작성하여 문의사항을 등록해주세요.</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-900 text-red-300 rounded-lg border border-red-800">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 문의 유형 */}
                    <div className="space-y-2">
                        <label htmlFor="inquiryType" className="block text-sm font-medium text-gray-300">
                            문의 유형
                        </label>
                        <select
                            id="inquiryType"
                            value={inquiryType}
                            onChange={(e) => setInquiryType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 bg-gray-800 text-gray-300"
                            required
                        >
                            <option value="">선택해주세요</option>
                            {inquiryTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 제목 */}
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                            제목
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 bg-gray-800 text-gray-300"
                            placeholder="제목을 입력하세요"
                            required
                        />
                    </div>

                    {/* 내용 */}
                    <div className="space-y-2">
                        <label htmlFor="content" className="block text-sm font-medium text-gray-300">
                            내용
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={10}
                            className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 bg-gray-800 text-gray-300 resize-none"
                            placeholder="문의 내용을 상세히 작성해주세요"
                            required
                        />
                    </div>

                    {/* 첨부파일 */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">첨부파일</label>
                        <div className="border border-dashed border-gray-700 rounded-lg p-8 cursor-pointer hover:bg-gray-800">
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="flex flex-col items-center justify-center cursor-pointer"
                            >
                                <svg
                                    className="w-8 h-8 text-gray-500 mb-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                <p className="text-sm text-gray-400 mb-1">파일 업로드</p>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </label>
                        </div>
                        {files.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium mb-2 text-gray-300">선택된 파일:</p>
                                <ul className="space-y-2">
                                    {files.map((file, index) => (
                                        <li key={index} className="text-sm text-gray-400">
                                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* 버튼 */}
                    <div className="flex justify-end gap-4 pt-4">
                        <Link
                            href="/my/inquiry"
                            className="px-6 py-2 text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 border border-gray-700"
                        >
                            취소
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-6 py-2 text-white bg-gray-700 rounded-lg hover:bg-gray-600 ${
                                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {isSubmitting ? '등록 중...' : '등록하기'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}
