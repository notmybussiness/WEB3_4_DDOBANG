'use client'

import { KakaoMap } from '@/components/common/KakaoMap'
import UserProfileModal from '@/components/my/UserProfileModal'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { useGlobalLoginMember } from '@/stores/auth/loginMember'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type PartyDetailResponse = components['schemas']['PartyDetailResponse']

export default function PartyDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { isLogin, loginMember } = useGlobalLoginMember()

    const [partyData, setPartyData] = useState<PartyDetailResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRequestsOpen, setIsRequestsOpen] = useState(false)
    const [userRole, setUserRole] = useState<'host' | 'member' | 'none'>('none')
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
    const [themeTags, setThemeTags] = useState<string[]>([])

    // 모임 ID 가져오기
    const partyId = params?.id

    // 모임 상세 정보 가져오기
    useEffect(() => {
        if (!isLogin) {
            console.log('로그인이 필요합니다.')
            return
        }

        const fetchPartyDetail = async () => {
            if (!partyId) {
                console.log('partyId가 없습니다.')
                return
            }

            setLoading(true)
            try {
                console.log('모임 상세 정보 요청 시작:', { partyId, isLogin })

                const response = await client
                    .GET('/api/v1/parties/{id}', {
                        params: {
                            path: { id: Number(partyId) },
                        },
                    })
                    .catch((error) => {
                        console.error('API 호출 실패:', error)
                        throw error
                    })

                console.log('API 응답 전체:', response)

                // response가 undefined인 경우
                if (!response) {
                    console.error('API 응답이 없습니다.')
                    throw new Error('API 응답이 없습니다.')
                }

                // response.data가 undefined인 경우
                if (!response.data) {
                    console.error('API 응답 데이터가 없습니다. 응답:', response)
                    throw new Error('API 응답 데이터가 없습니다.')
                }

                const responseData = response.data
                console.log('파싱된 응답 데이터:', responseData)

                // responseData.data가 없는 경우
                if (!responseData.data) {
                    console.error('모임 데이터가 없습니다. 응답 데이터:', responseData)
                    throw new Error('모임 데이터를 찾을 수 없습니다.')
                }

                console.log('모임 데이터:', responseData.data)
                console.log('로그인된 사용자 닉네임:', loginMember?.nickname)

                setPartyData(responseData.data)
                setUserRole(
                    responseData.data.hostNickname === loginMember?.nickname
                        ? 'host'
                        : responseData.data.acceptedPartyMembers?.some(
                              (member) => member.nickname === loginMember?.nickname,
                          )
                        ? 'member'
                        : 'none',
                )
            } catch (error) {
                console.error('모임 정보 조회 실패:', error)
                // TODO: 500 에러
                alert(`서버 오류가 발생했습니다.`)
            } finally {
                setLoading(false)
            }
        }

        fetchPartyDetail()
    }, [partyId, isLogin, router, loginMember?.nickname])

    // themeTags 관련 코드 수정
    useEffect(() => {
        if (partyData?.tagNames) {
            setThemeTags(partyData.tagNames.filter(Boolean))
        }
    }, [partyData])

    const handleJoinRequest = async () => {
        if (!partyId) return

        try {
            await client.POST('/api/v1/parties/{id}/apply', {
                params: {
                    path: { id: Number(partyId) },
                },
            })

            alert('참가 신청이 완료되었습니다.')
            // 페이지 새로고침
            window.location.reload()
        } catch (error) {
            console.error('참가 신청 중 오류:', error)
            alert('참가 신청 중 오류가 발생했습니다.')
        }
    }

    const handleCancelJoin = async () => {
        if (!partyId) return

        try {
            await client.DELETE('/api/v1/parties/{id}/cancel', {
                params: {
                    path: { id: Number(partyId) },
                },
            })

            alert('참가가 취소되었습니다.')
            // 페이지 새로고침
            window.location.reload()
        } catch (error) {
            console.error('참가 취소 중 오류:', error)
            alert('참가 취소 중 오류가 발생했습니다.')
        }
    }

    // 참가 요청 승인 처리
    const handleApproveRequest = async (memberId: number | undefined) => {
        if (!partyId || !memberId) return

        try {
            await client.POST('/api/v1/parties/{id}/accept/{memberId}', {
                params: {
                    path: {
                        id: Number(partyId),
                        memberId: Number(memberId),
                    },
                },
            })

            alert('참가 요청이 승인되었습니다.')
            // 페이지 새로고침
            window.location.reload()
        } catch (error) {
            console.error('참가 요청 승인 중 오류:', error)
            alert('참가 요청 승인 중 오류가 발생했습니다.')
        }
    }

    // 참가 요청 거절 처리
    const handleRejectRequest = async (memberId: number | undefined) => {
        if (!partyId || !memberId) return

        if (!confirm('정말로 참가 요청을 거절하시겠습니까?')) return

        try {
            await client.POST('/api/v1/parties/{id}/reject/{memberId}', {
                params: {
                    path: {
                        id: Number(partyId),
                        memberId: Number(memberId),
                    },
                },
            })

            alert('참가 요청이 거절되었습니다.')
            // 페이지 새로고침
            window.location.reload()
        } catch (error) {
            console.error('참가 요청 거절 중 오류:', error)
            alert('참가 요청 거절 중 오류가 발생했습니다.')
        }
    }

    // 모임 취소 처리
    const handleCancelParty = async () => {
        if (!partyId) return

        if (!confirm('정말로 모임을 취소하시겠습니까?')) return

        try {
            await client.DELETE('/api/v1/parties/{id}', {
                params: {
                    path: { id: Number(partyId) },
                },
            })
            alert('모임이 취소되었습니다.')
            router.push('/parties')
        } catch (error) {
            console.error('모임 취소 중 오류:', error)
            alert('모임 취소 중 오류가 발생했습니다.')
        }
    }

    // 모임 실행 완료 처리
    const handleExecuteParty = async () => {
        if (!partyId) return

        try {
            await client.PATCH('/api/v1/parties/{id}/executed', {
                params: {
                    path: { id: Number(partyId) },
                },
            })
            alert('모임이 실행 완료 상태로 변경되었습니다.')
            window.location.reload()
        } catch (error) {
            console.error('모임 실행 완료 처리 중 오류:', error)
            alert('모임 실행 완료 처리 중 오류가 발생했습니다.')
        }
    }

    // 모임 미실행 처리
    const handleUnexecuteParty = async () => {
        if (!partyId) return

        try {
            await client.PATCH('/api/v1/parties/{id}/unexecuted', {
                params: {
                    path: { id: Number(partyId) },
                },
            })
            alert('모임이 미실행 상태로 변경되었습니다.')
            window.location.reload()
        } catch (error) {
            console.error('모임 미실행 처리 중 오류:', error)
            alert('모임 미실행 처리 중 오류가 발생했습니다.')
        }
    }

    // handleMemberClick 함수 수정
    const handleMemberClick = (memberId: number | undefined) => {
        console.log('handleMemberClick called with memberId:', memberId) // 디버깅용
        if (memberId !== undefined) {
            console.log('Setting selectedMemberId to:', memberId) // 디버깅용
            setSelectedMemberId(memberId)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFB130] mx-auto"></div>
                    <p className="mt-4 text-gray-400">로딩 중...</p>
                </div>
            </div>
        )
    }

    // 에러가 발생하면 콘솔에만 출력
    if (error) {
        console.error('모임 상세 정보 조회 실패:', error)
    }

    // partyData가 없는 경우 기본 화면 표시
    if (!partyData) {
        return (
            <div className="min-h-screen bg-gray-900">
                <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-8 mb-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold mb-4 text-white">모임 정보를 불러올 수 없습니다</h1>
                            <p className="text-gray-400 mb-6">잠시 후 다시 시도해주세요.</p>
                            <button
                                onClick={() => router.push('/parties')}
                                className="px-4 py-2 bg-[#FFB130] text-white rounded-lg hover:bg-[#F0A420]"
                            >
                                모임 목록으로 돌아가기
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    // scheduledAt을 날짜와 시간으로 분리
    const formattedDate = partyData.scheduledAt
        ? new Date(partyData.scheduledAt)
              .toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
              })
              .replace(/\. /g, '-')
              .replace(/\.$/, '')
        : ''

    const formattedTime = partyData.scheduledAt
        ? new Date(partyData.scheduledAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          })
        : ''

    // 참가자 목록에 모임장 포함 여부 확인
    const acceptedMembersCount = partyData.acceptedParticipantsCount || 0
    const totalRemainingCount = (partyData.totalParticipants || 0) - acceptedMembersCount

    return (
        <div className="min-h-screen bg-gray-900">
            <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
                {/* [1단] 모임 기본 정보 */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-8 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold mb-2 text-white">{partyData.title}</h1>
                            <p className="text-gray-400">
                                {formattedDate} {formattedTime}
                            </p>
                        </div>
                        <div className="flex items-center mt-4 md:mt-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden relative mr-3 bg-gray-700">
                                <Image
                                    src={partyData.hostProfilePictureUrl || '/default-profile.svg'}
                                    alt={partyData.hostNickname || '모임장'}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center">
                                    <span className="text-white font-medium">{partyData.hostNickname || '모임장'}</span>
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-[#FFB130] text-white rounded-full">
                                        모임장
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-300 mr-2">초심자</span>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    partyData.rookieAvailable
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                }`}
                            >
                                {partyData.rookieAvailable ? '가능' : '불가능'}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-300 mr-2">모집 현황</span>
                            <div className="flex items-center">
                                <div className="flex -space-x-2 mr-2">
                                    {/* 모임장 정보 추가 */}
                                    <div key={partyData.hostId} className="relative group">
                                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#FFB130] bg-gray-700">
                                            <Image
                                                src={partyData.hostProfilePictureUrl || '/default-profile.svg'}
                                                alt={partyData.hostNickname || '모임장'}
                                                fill
                                                className="object-cover rounded-full"
                                            />
                                        </div>
                                        <div className="absolute top-full left-0 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-gray-800 shadow-md rounded-md p-2 z-20 w-40 border border-gray-700">
                                            <div className="flex items-center mb-2">
                                                <div className="w-10 h-10 rounded-full overflow-hidden mr-2 bg-gray-700 relative">
                                                    <Image
                                                        src={partyData.hostProfilePictureUrl || '/default-profile.svg'}
                                                        alt={partyData.hostNickname || ''}
                                                        fill
                                                        className="object-cover rounded-full"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white">
                                                        {partyData.hostNickname}
                                                    </span>
                                                    <span className="text-[10px] bg-[#FFB130] text-white rounded-full px-1.5 py-0.5 mt-0.5 flex items-center justify-center">
                                                        모임장
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleMemberClick(partyData.hostId)}
                                                className="text-xs text-blue-400 hover:underline mt-1"
                                            >
                                                프로필 보기
                                            </button>
                                        </div>
                                    </div>
                                    {/* 일반 참가자들 */}
                                    {partyData.acceptedPartyMembers
                                        ?.filter((member) => member.id !== partyData.hostId)
                                        .slice(0, 2)
                                        .map((member) => (
                                            <div key={member.id} className="relative group">
                                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-700 bg-gray-700">
                                                    <Image
                                                        src={member.profilePictureUrl || '/default-profile.svg'}
                                                        alt={member.nickname || '참가자'}
                                                        fill
                                                        className="object-cover rounded-full"
                                                    />
                                                </div>
                                                <div className="absolute top-full left-0 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-gray-800 shadow-md rounded-md p-2 z-20 w-40 border border-gray-700">
                                                    <div className="flex items-center mb-2">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden mr-2 bg-gray-700 relative">
                                                            <Image
                                                                src={member.profilePictureUrl || '/default-profile.svg'}
                                                                alt={member.nickname || ''}
                                                                fill
                                                                className="object-cover rounded-full"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-white">
                                                                {member.nickname}
                                                            </span>
                                                            {member.id === partyData.hostId && (
                                                                <span className="text-[10px] bg-[#FFB130] text-white rounded-full px-1.5 py-0.5 mt-0.5 flex items-center justify-center">
                                                                    모임장
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleMemberClick(member.id)}
                                                        className="text-xs text-blue-400 hover:underline mt-1"
                                                    >
                                                        프로필 보기
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    {acceptedMembersCount > 0 && (
                                        <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-700 flex items-center justify-center text-xs text-gray-300 hover:bg-gray-600 transition">
                                            +{acceptedMembersCount}
                                        </div>
                                    )}
                                    {totalRemainingCount > 0 && (
                                        <div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-gray-700 flex items-center justify-center text-xs text-gray-300">
                                            {totalRemainingCount}명
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-gray-400 font-medium">
                                    {acceptedMembersCount}/{partyData.totalParticipants || 0}명
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 모임 내용 */}
                    {partyData.content && (
                        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                            <h3 className="text-md font-semibold mb-2 text-white">모임 소개</h3>
                            <p className="text-gray-300 whitespace-pre-wrap">{partyData.content}</p>
                        </div>
                    )}
                </div>

                {/* [2단] 참가 신청 목록 (모임장 권한) */}
                {userRole === 'host' && partyData.AppliedPartyMembers && partyData.AppliedPartyMembers.length > 0 && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-8 mb-6">
                        <button
                            onClick={() => setIsRequestsOpen(!isRequestsOpen)}
                            className="w-full flex justify-between items-center text-left"
                        >
                            <h2 className="text-xl font-bold text-white">
                                참가 신청 목록{' '}
                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                                    {partyData.AppliedPartyMembers.length}
                                </span>
                            </h2>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-5 w-5 transition-transform text-white ${
                                    isRequestsOpen ? 'transform rotate-180' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isRequestsOpen && (
                            <div className="mt-4 space-y-4">
                                {partyData.AppliedPartyMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:bg-gray-700"
                                    >
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full overflow-hidden relative mr-3 bg-gray-700">
                                                <Image
                                                    src={member.profilePictureUrl || '/default-profile.svg'}
                                                    alt={member.nickname || '신청자'}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center">
                                                    <span className="font-medium text-white">{member.nickname}</span>
                                                    {member.id === partyData.hostId && (
                                                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#FFB130] text-white rounded-full">
                                                            모임장
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleMemberClick(member.id)}
                                                    className="text-sm text-blue-400 hover:underline mt-1"
                                                >
                                                    프로필 보기
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRejectRequest(member.id)}
                                                className="bg-gray-600 hover:bg-gray-500 text-gray-200 px-4 py-2 rounded-lg transition"
                                            >
                                                거절
                                            </button>
                                            <button
                                                onClick={() => handleApproveRequest(member.id)}
                                                className="bg-[#FFB130] hover:bg-[#F0A420] text-white px-4 py-2 rounded-lg transition"
                                            >
                                                승인
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* [3단] 테마 정보 */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-8 mb-6">
                    <h2 className="text-xl font-bold mb-6 text-white">테마 정보</h2>
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-48 h-64 relative rounded-lg overflow-hidden bg-gray-700">
                            <Image
                                src={partyData.themeThumbnailUrl || '/default-thumbnail.svg'}
                                alt={partyData.themeName || '테마 이미지'}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2 text-white">{partyData.themeName}</h3>

                            {/* 장르 및 태그 */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {partyData.tagNames?.map((tagName: string, index: number) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                                    >
                                        #{tagName}
                                    </span>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center">
                                    <span className="text-gray-400 mr-2">노힌트 탈출률:</span>
                                    <span className="font-medium text-white">
                                        {(partyData.noHintEscapeRate || 0).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-gray-400 mr-2">유저 탈출률:</span>
                                    <span className="font-medium text-white">
                                        {(partyData.escapeResult || 0).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-gray-400 mr-2">평균 탈출 시간:</span>
                                    <span className="font-medium text-white">{partyData.escapeTimeAvg || 0}분</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-gray-400 mr-2">플레이 시간:</span>
                                    <span className="font-medium text-white">60분</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* [4단] 매장 위치 및 정보 */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-8 mb-6">
                    <h2 className="text-xl font-bold mb-6 text-white">매장 위치 및 정보</h2>
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <h3 className="text-lg font-medium mb-2 text-white">{partyData.storeName}</h3>
                            <p className="text-gray-400 mb-4">{partyData.storeAddress}</p>

                            {/* 고정 지도 이미지 사용 */}
                            <div className="w-full h-80 bg-gray-700 rounded-lg relative">
                                <KakaoMap
                                    width="100%"
                                    height="320px"
                                    address={partyData.storeAddress || ''}
                                    storeName={partyData.storeName}
                                    name={partyData.storeName}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* [5단] 버튼 섹션 */}
                <div className="flex flex-wrap justify-center gap-4 my-8">
                    {/* 모임장(글쓴이)인 경우 */}
                    {userRole === 'host' && (
                        <>
                            <button
                                onClick={handleExecuteParty}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                모임 실행 완료
                            </button>
                            <button
                                onClick={handleUnexecuteParty}
                                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                            >
                                모임 미실행
                            </button>
                            <Link
                                href={`/parties/${partyId}/edit`}
                                className="px-6 py-3 bg-[#FFB130] text-white rounded-lg hover:bg-[#F0A420] transition"
                            >
                                모임 정보 수정
                            </Link>
                            <button
                                onClick={handleCancelParty}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                모임 취소
                            </button>
                        </>
                    )}

                    {/* 모임원(글쓴이가 아닌 경우)인 경우 */}
                    {userRole === 'member' && (
                        <button
                            onClick={handleCancelJoin}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            참가 취소
                        </button>
                    )}

                    {/* 일반 사용자(글쓴이가 아닌 경우)인 경우 */}
                    {userRole === 'none' && (
                        <button
                            onClick={handleJoinRequest}
                            className="px-6 py-3 bg-[#FFB130] text-white rounded-lg hover:bg-[#F0A420] transition"
                            disabled={
                                (partyData.acceptedPartyMembers?.length || 0) >= (partyData.totalParticipants || 0)
                            }
                        >
                            {(partyData.acceptedPartyMembers?.length || 0) >= (partyData.totalParticipants || 0)
                                ? '모집 완료'
                                : '참가 신청'}
                        </button>
                    )}
                </div>
            </main>
            {selectedMemberId !== null && (
                <UserProfileModal
                    memberId={selectedMemberId}
                    isOpen={true} // 항상 true로 설정
                    onClose={() => {
                        console.log('Closing modal') // 디버깅용
                        setSelectedMemberId(null)
                    }}
                />
            )}
        </div>
    )
}
