import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import MessageModal from './MessageModal'

interface UserProfileModalProps {
    memberId: number
    isOpen: boolean
    onClose: () => void
}

type OtherMemberProfileResponse = components['schemas']['OtherMemberProfileResponse']
type MemberReviewResponse = components['schemas']['MemberReviewResponse']

interface ApiError {
    errorCode: string
    message: string
    errors: null
}

const DEFAULT_PROFILE_IMAGE = '/profile_default.jpg'

export default function UserProfileModal({ memberId, isOpen, onClose }: UserProfileModalProps) {
    const [profile, setProfile] = useState<OtherMemberProfileResponse | null>(null)
    const [reviewStats, setReviewStats] = useState<MemberReviewResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileError, setProfileError] = useState<string | null>(null)
    const [reviewError, setReviewError] = useState<string | null>(null)
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)

    useEffect(() => {
        if (isOpen && memberId) {
            fetchUserProfile()
            fetchReviewStats()
        }
    }, [isOpen, memberId])

    const fetchUserProfile = async () => {
        try {
            setLoading(true)
            const response = await client.GET('/api/v1/members/{memberId}/profile', {
                params: {
                    path: {
                        memberId: memberId,
                    },
                },
            })

            // @ts-ignore - openapi-fetch의 타입 정의가 실제 응답과 다름
            if (response.error?.message) {
                // @ts-ignore
                alert(response.error.message)
                onClose()
                return
            }

            if (response.data?.data) {
                setProfile(response.data.data)
                setProfileError(null)
            }
        } catch (err: any) {
            console.error('프로필 정보 로드 중 오류:', err)
            const errorMessage = err.response?.data?.message || '프로필 정보를 불러오는데 실패했습니다.'
            alert(errorMessage)
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const fetchReviewStats = async () => {
        try {
            const response = await client.GET('/members/{id}/review', {
                params: {
                    path: {
                        id: memberId,
                    },
                },
            })

            // @ts-ignore - openapi-fetch의 타입 정의가 실제 응답과 다름
            if (response.error?.message) {
                // @ts-ignore
                alert(response.error.message)
                // @ts-ignore
                setReviewError(response.error.message)
                setReviewStats(null)
                return
            }

            if (response.data?.data) {
                setReviewStats(response.data.data)
                setReviewError(null)
            }
        } catch (err: any) {
            console.error('리뷰 통계 로드 중 오류:', err)
            const errorMessage = err.response?.data?.message || '리뷰 통계를 불러오는데 실패했습니다.'
            alert(errorMessage)
            setReviewError(errorMessage)
            setReviewStats(null)
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl max-w-lg w-full mx-4 overflow-hidden">
                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFB130] mx-auto"></div>
                            <p className="mt-4 text-gray-400">로딩 중...</p>
                        </div>
                    ) : profileError ? (
                        <div className="p-6 text-center">
                            <p className="text-red-500">{profileError}</p>
                            <button
                                onClick={onClose}
                                className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                            >
                                닫기
                            </button>
                        </div>
                    ) : profile && profile.profile ? (
                        <>
                            <div className="px-6 pt-6 pb-6 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-white hover:text-gray-200"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                                <div className="flex items-center mb-4">
                                    <div className="w-24 h-24 rounded-full border-4 border-gray-800 overflow-hidden relative bg-gray-700">
                                        <Image
                                            src={profile.profile?.profilePicture || DEFAULT_PROFILE_IMAGE}
                                            alt={profile.profile?.nickname || ''}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="ml-4 mb-2 flex-1">
                                        <h2 className="text-2xl font-bold text-white">{profile.profile?.nickname}</h2>
                                        <p className="text-white mt-2">{profile.profile?.introduction}</p>
                                        <div className="flex items-center mt-2">
                                            <span className="text-gray-400 text-sm">매너 점수:</span>
                                            <span className="ml-1 text-[#FFB130] font-medium">
                                                {profile.profile?.mannerScore}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-700 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-400 mb-2">방탈출 통계</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">총 참여</span>
                                                <span className="text-white font-medium">
                                                    {profile.stats?.totalCount}회
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">탈출 성공률</span>
                                                <span className="text-white font-medium">
                                                    {(profile.stats?.successRate || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">노힌트 성공률</span>
                                                <span className="text-white font-medium">
                                                    {(profile.stats?.noHintSuccessRate || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-700 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-400 mb-2">활동 정보</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">모임장 횟수</span>
                                                <span className="text-white font-medium">
                                                    {profile.profile?.hostCount}회
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">성별</span>
                                                <span className="text-white font-medium">
                                                    {profile.profile?.gender === 'MALE' ? '남성' : '여성'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {profile.tags && profile.tags.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-400 mb-2">선호하는 태그</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.tags.map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                                                >
                                                    #{tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {reviewStats && !reviewError ? (
                                    <div className="mt-6">
                                        <h3 className="text-sm font-medium text-gray-400 mb-3">리뷰 통계</h3>
                                        <div className="flex gap-2">
                                            <div className="bg-gray-700 rounded-lg p-3 flex-1 text-center">
                                                <div className="text-gray-400 text-xs">평균</div>
                                                <div className="text-white text-sm font-medium mt-0.5">
                                                    {reviewStats.averageScore?.toFixed(1)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-700 rounded-lg p-3 flex-1 text-center">
                                                <div className="text-gray-400 text-xs">총 리뷰</div>
                                                <div className="text-white text-sm font-medium mt-0.5">
                                                    {reviewStats.totalReviews}
                                                </div>
                                            </div>
                                            <div className="bg-gray-700 rounded-lg p-3 flex-1 text-center">
                                                <div className="text-gray-400 text-xs">긍정</div>
                                                <div className="text-white text-sm font-medium mt-0.5">
                                                    {reviewStats.positiveCount}
                                                </div>
                                            </div>
                                            <div className="bg-gray-700 rounded-lg p-3 flex-1 text-center">
                                                <div className="text-gray-400 text-xs">부정</div>
                                                <div className="text-white text-sm font-medium mt-0.5">
                                                    {reviewStats.negativeCount}
                                                </div>
                                            </div>
                                            <div className="bg-gray-700 rounded-lg p-3 flex-1 text-center">
                                                <div className="text-gray-400 text-xs">노쇼</div>
                                                <div className="text-white text-sm font-medium mt-0.5">
                                                    {reviewStats.noShowCount}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : reviewError ? (
                                    <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                                        <p className="text-red-400 text-sm text-center">{reviewError}</p>
                                    </div>
                                ) : null}

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => setIsMessageModalOpen(true)}
                                        className="px-4 py-2 bg-[#FFB130] hover:bg-[#F0A420] text-white rounded-lg flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                        쪽지 보내기
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>

            <MessageModal
                receiverId={memberId}
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                onSuccess={() => {
                    // You can add any success handling here, like showing a toast notification
                }}
            />
        </>
    )
}
