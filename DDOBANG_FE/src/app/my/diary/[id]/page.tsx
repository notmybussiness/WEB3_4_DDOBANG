'use client'

import { paths } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import 'slick-carousel/slick/slick-theme.css'
import 'slick-carousel/slick/slick.css'

// API 응답 타입 정의
type DiaryResponse = paths['/api/v1/diaries/{id}']['get']['responses']['200']['content']['application/json']

// 원형 그래프 컴포넌트
const CircularRating = ({ value, label }: { value: number; label: string }) => {
    const radius = 40
    const circumference = 2 * Math.PI * radius
    const progress = (value / 5) * circumference
    const rotation = -90 // 시작 위치를 12시 방향으로 조정

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                {/* 배경 원 */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    {/* 진행도 원 */}
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke="#FFB130"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        strokeLinecap="round"
                    />
                </svg>
                {/* 중앙 텍스트 */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold">{value}/5</span>
                </div>
            </div>
            <span className="mt-2 text-sm text-gray-600">{label}</span>
        </div>
    )
}

// 이미지 모달 컴포넌트
const ImageModal = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="relative w-[70vw] h-[70vh]" onClick={(e) => e.stopPropagation()}>
                <img src={imageUrl} alt="확대된 탈출 사진" className="w-full h-full object-contain" />
                <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params)
    const [diary, setDiary] = useState<DiaryResponse['data'] | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const router = useRouter()

    // 삭제 핸들러 함수 추가
    const handleDelete = async () => {
        if (!confirm('정말로 이 탈출일지를 삭제하시겠습니까?')) {
            return
        }

        try {
            const { data, error } = await client.DELETE('/api/v1/diaries/{id}', {
                params: {
                    path: {
                        id: Number(unwrappedParams.id),
                    },
                },
            })

            if (error) {
                throw error
            }

            if (data) {
                alert('탈출일지가 성공적으로 삭제되었습니다.')
                router.push('/my/diary')
            }
        } catch (error) {
            console.error('Error deleting diary:', error)
            alert('탈출일지 삭제에 실패했습니다.')
        }
    }

    useEffect(() => {
        const fetchDiary = async () => {
            try {
                setIsLoading(true)

                const { data, error } = await client.GET('/api/v1/diaries/{id}', {
                    params: {
                        path: {
                            id: Number(unwrappedParams.id),
                        },
                    },
                })

                if (error) {
                    throw error
                }

                if (!data?.data) {
                    throw new Error('일지 데이터를 불러오는데 실패했습니다.')
                }

                setDiary(data.data)
                setError(null)
            } catch (err) {
                console.error('Error details:', err)
                setError('탈출일지를 불러오는데 실패했습니다.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchDiary()
    }, [unwrappedParams.id])

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </main>
        )
    }

    if (error || !diary) {
        return (
            <main className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error || '탈출일지를 찾을 수 없습니다.'}
                    </div>
                    <Link href="/my/diary" className="mt-4 inline-block text-blue-600 hover:underline">
                        목록으로 돌아가기
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* 헤더 - 버튼 영역 */}
                <div className="flex justify-between items-center mb-6">
                    <Link
                        href="/my/diary"
                        className="text-[#FFB130] hover:text-[#F0A120] transition-colors flex items-center"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        목록으로
                    </Link>
                    <div className="flex gap-2">
                        <Link
                            href={`/my/diary/${diary.id}/edit`}
                            className="px-4 py-2 bg-[#FFB130] text-black rounded-lg hover:bg-[#F0A120] transition-colors"
                        >
                            수정하기
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            삭제하기
                        </button>
                    </div>
                </div>

                {/* 테마 이미지 섹션 */}
                <div className="bg-gray-800 rounded-lg overflow-hidden mb-6 shadow-sm relative">
                    <div className="h-[300px] relative">
                        {diary.thumbnailUrl ? (
                            <img
                                src={diary.thumbnailUrl}
                                alt={diary.themeName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                <svg
                                    className="w-16 h-16 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        )}
                        {/* 테마 이름 오버레이 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                            <h1 className="text-4xl font-bold text-white p-8 w-full">
                                {diary.themeName}
                                <div className="text-lg font-normal mt-2 text-gray-300">{diary.storeName}</div>
                            </h1>
                        </div>
                    </div>
                </div>

                {/* 2열 레이아웃: 탈출 사진 카드 | 플레이 정보 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* 탈출 사진 카드 */}
                    <div className="bg-gray-800 rounded-lg shadow-sm p-6 flex flex-col">
                        <h2 className="text-lg font-semibold mb-4 text-white">탈출 사진</h2>
                        <div className="flex-1 relative h-[200px]">
                            <div className="absolute inset-0 rounded-lg overflow-hidden bg-gray-700">
                                {diary.imageUrl ? (
                                    <img
                                        src={diary.imageUrl}
                                        alt="탈출 사진"
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => setShowImageModal(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg
                                            className="w-16 h-16 text-gray-500"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 플레이 정보 카드 */}
                    <div className="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 text-white">플레이 정보</h2>

                        {/* 기본 정보 */}
                        <div className="mb-4">
                            <h3 className="text-md font-medium mb-4 text-gray-300">기본 정보</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                            <svg
                                                className="w-5 h-5 text-gray-300"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">플레이 날짜</p>
                                            <p className="text-sm font-medium text-white">{diary.escapeDate}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                            <svg
                                                className="w-5 h-5 text-gray-300"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">참여자</p>
                                            <p className="text-sm font-medium text-white">{diary.participants}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 구분선 */}
                        <div className="border-t border-gray-700 my-6"></div>

                        {/* 플레이 결과 */}
                        <div>
                            <h3 className="text-md font-medium mb-4 text-gray-300">플레이 결과</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div
                                    className={`bg-gray-700 p-4 rounded-lg ${
                                        diary.escapeResult ? 'bg-green-900/30' : 'bg-red-900/30'
                                    }`}
                                >
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                                                diary.escapeResult ? 'bg-green-800' : 'bg-red-800'
                                            }`}
                                        >
                                            {diary.escapeResult ? (
                                                <svg
                                                    className="w-5 h-5 text-green-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    className="w-5 h-5 text-red-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium mb-1 text-white">
                                                {diary.escapeResult ? '성공' : '실패'}
                                            </p>
                                            <p className="text-xs text-gray-400">탈출 성공</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center mb-2">
                                            <svg
                                                className="w-5 h-5 text-blue-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium mb-1 text-white">
                                                {diary.elapsedTime
                                                    ? `${Math.floor(diary.elapsedTime / 60)}분 ${
                                                          diary.elapsedTime % 60
                                                      }초`
                                                    : '-'}
                                            </p>
                                            <p className="text-xs text-gray-400">탈출 시간</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-yellow-900 flex items-center justify-center mb-2">
                                            <svg
                                                className="w-5 h-5 text-yellow-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                                />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium mb-1 text-white">{diary.hintCount}회</p>
                                            <p className="text-xs text-gray-400">힌트 사용</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 테마 평가 및 특성 통합 섹션 */}
                <div className="bg-gray-800 rounded-lg shadow-sm mb-6 p-6">
                    <h2 className="text-lg font-semibold mb-6 text-white">테마 평가</h2>

                    {/* 테마 특성 */}
                    <div className="mb-8">
                        <h3 className="text-md font-medium mb-4 text-gray-300">테마 특성</h3>
                        <div className="flex justify-around items-center text-white">
                            <CircularRating value={diary.difficulty ?? 0} label="난이도" />
                            <CircularRating value={diary.fear ?? 0} label="공포도" />
                            <CircularRating value={diary.activity ?? 0} label="활동성" />
                        </div>
                    </div>

                    {/* 구분선 */}
                    <div className="border-t border-gray-700 my-6"></div>

                    {/* 상세 평가 */}
                    <div>
                        <h3 className="text-md font-medium mb-4 text-gray-300">상세 평가</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {[
                                { id: 'interior', label: '인테리어', value: diary.interior },
                                { id: 'question', label: '문제 구성', value: diary.question },
                                { id: 'story', label: '스토리', value: diary.story },
                                { id: 'production', label: '연출', value: diary.production },
                                { id: 'satisfaction', label: '만족도', value: diary.satisfaction },
                                { id: 'deviceRatio', label: '장치 비중', value: diary.deviceRatio },
                            ].map((item) => (
                                <div key={item.id} className="bg-gray-700 p-4 rounded-lg">
                                    <p className="text-gray-300 mb-2 text-sm">{item.label}</p>
                                    <div className="flex items-center">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <svg
                                                key={i}
                                                className={`w-5 h-5 ${
                                                    i < (item.value ?? 0) ? 'text-[#FFB130]' : 'text-gray-600'
                                                }`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 리뷰 카드 */}
                <div className="bg-gray-800 rounded-lg shadow-sm mb-6 p-6">
                    <h2 className="text-lg font-semibold mb-6 text-white">리뷰</h2>
                    <div className="bg-gray-700 p-6 rounded-lg">
                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{diary.review}</p>
                    </div>
                </div>

                {/* 이미지 모달 */}
                {showImageModal && diary.imageUrl && (
                    <ImageModal imageUrl={diary.imageUrl} onClose={() => setShowImageModal(false)} />
                )}
            </div>
        </main>
    )
}
