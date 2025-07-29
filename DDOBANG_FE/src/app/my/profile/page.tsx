'use client'

import { HistoryCalendar } from '@/components/history/HistoryCalendar'
import WishesThemesModal from '@/components/my/WishesThemesModal'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { useGlobalLoginMember } from '@/stores/auth/loginMember'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// 타입 정의
type UserProfile = components['schemas']['BasicProfileResponse'] & {
    tags: string[]
    stats: {
        totalCount: number
        successRate: number
        noHintSuccessRate: number
    }
}

type WishTheme = components['schemas']['ThemesResponse']
type CalendarDiary = components['schemas']['DiaryListDto']
type PartyHistory = components['schemas']['MyJoinedPartySummaryResponse']

export default function MyPage() {
    const { isLogin, loginMember } = useGlobalLoginMember()
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [wishThemes, setWishThemes] = useState<WishTheme[]>([])
    const [calendarDiaries, setCalendarDiaries] = useState<CalendarDiary[]>([])
    const [partyHistories, setPartyHistories] = useState<PartyHistory[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isWishesModalOpen, setIsWishesModalOpen] = useState(false)

    // 프로필 정보 가져오기
    const fetchUserProfile = async () => {
        try {
            if (!isLogin) {
                return
            }

            // 회원 통계 정보 가져오기
            const statsResponse = await client.GET('/api/v1/members/stat')

            const stats = statsResponse?.data?.data || {
                totalCount: 0,
                successRate: 0,
                noHintSuccessRate: 0,
            }

            // 프로필 정보 구성
            const userProfile: UserProfile = {
                nickname: loginMember?.nickname || '',
                profilePictureUrl: loginMember?.profilePictureUrl || '/default-profile.svg',
                gender: loginMember?.gender || 'BLIND',
                introduction: loginMember?.introduction || '',
                mannerScore: loginMember?.mannerScore || 0,
                tags: [], // 태그는 별도 API로 가져와야 함
                stats: {
                    totalCount: stats.totalCount || 0,
                    successRate: stats.successRate || 0,
                    noHintSuccessRate: stats.noHintSuccessRate || 0,
                },
            }

            // 태그 정보 가져오기
            const tagsResponse = await client.GET('/api/v1/members/me/tags')
            const tags = tagsResponse?.data?.data || []
            userProfile.tags = tags.map((tag: components['schemas']['MemberTagResponse']) => tag.name || '')

            setUserProfile(userProfile)
        } catch (error) {
            console.error('프로필 로딩 에러:', error)
            // 에러 상태 대신 기본값 설정
            setUserProfile({
                nickname: loginMember?.nickname || '',
                profilePictureUrl: loginMember?.profilePictureUrl || '/default-thumbnail.svg',
                gender: loginMember?.gender || 'BLIND',
                introduction: loginMember?.introduction || '',
                mannerScore: loginMember?.mannerScore || 0,
                tags: [],
                stats: {
                    totalCount: 0,
                    successRate: 0,
                    noHintSuccessRate: 0,
                },
            })
        }
    }

    // 희망 테마 가져오기
    const fetchWishThemes = async () => {
        try {
            const response = await client.GET('/api/v1/themes/wishes')

            const wishThemesData = response?.data?.data || []
            const wishThemes: WishTheme[] = wishThemesData.map((theme: any) => ({
                id: theme.id || 0,
                name: theme.name || '',
                storeName: theme.storeName || '',
                runtime: theme.runtime || 0,
                recommendedParticipants: theme.recommendedParticipants || '',
                tags: theme.tags || [],
                thumbnailUrl: theme.thumbnailUrl || '',
            }))
            setWishThemes(wishThemes)
        } catch (error) {
            console.error('희망 테마 로딩 에러:', error)
            setWishThemes([])
        }
    }

    // 달력 데이터 가져오기
    const fetchCalendarDiaries = async (targetMonth?: Date) => {
        try {
            if (!isLogin) {
                return
            }

            // 현재 선택된 날짜가 없으면 현재 월을 기준으로 조회
            const targetDate = targetMonth || selectedDate || new Date()
            const year = targetDate.getFullYear()
            const month = targetDate.getMonth() + 1

            const response = await client.GET('/api/v1/diaries', {
                params: { query: { year, month } },
            })

            const diaries = response?.data?.data || []
            setCalendarDiaries(diaries)
        } catch (error) {
            console.error('달력 데이터 로딩 에러:', error)
            setCalendarDiaries([])
        }
    }

    // 모임 히스토리 가져오기
    const fetchPartyHistories = async () => {
        try {
            if (!isLogin) {
                return
            }

            const response = await client.GET('/api/v1/parties/joins/me')

            const histories = response?.data?.data?.items || []
            setPartyHistories(histories)
        } catch (error) {
            console.error('모임 히스토리 로딩 에러:', error)
            setPartyHistories([])
        }
    }

    // 선택된 날짜가 변경될 때마다 달력 데이터 다시 가져오기
    useEffect(() => {
        if (selectedDate) {
            fetchCalendarDiaries()
        }
    }, [selectedDate])

    // 컴포넌트 마운트 시 데이터 로딩
    useEffect(() => {
        if (!isLogin) {
            setError('로그인이 필요합니다.')
            setIsLoading(false)
            return
        }

        const loadData = async () => {
            setIsLoading(true)
            try {
                await Promise.all([
                    fetchUserProfile(),
                    fetchWishThemes(),
                    fetchCalendarDiaries(),
                    fetchPartyHistories(),
                ])
            } catch (error) {
                console.error('데이터 로딩 에러:', error)
                setError('데이터를 불러오는데 실패했습니다.')
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [isLogin])

    // 테마 삭제 함수
    const handleDeleteTheme = async (themeId: number) => {
        if (themeId === undefined) return

        try {
            await client.DELETE('/api/v1/themes/{id}/wishes', {
                params: {
                    path: {
                        id: themeId,
                    },
                },
            })

            // 삭제 후 목록 갱신
            setWishThemes((prevThemes) => prevThemes.filter((theme) => theme.id !== themeId))
        } catch (error) {
            console.error('테마 삭제 에러:', error)
            setError('테마 삭제에 실패했습니다.')
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (!isLogin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">로그인이 필요합니다.</div>
            </div>
        )
    }

    if (!userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">프로필을 찾을 수 없습니다.</div>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-900">
            {/* Section 1: 사용자 프로필 */}
            <section className="bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-10">
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 mb-8">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#FFB130] shadow-md">
                                    <Image
                                        src={userProfile.profilePictureUrl || '/default-profile.svg'}
                                        alt="프로필 이미지"
                                        width={128}
                                        height={128}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-black rounded-full flex items-center justify-center shadow-md">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        {userProfile.gender === 'MALE' ? (
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        ) : (
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        )}
                                    </svg>
                                </div>
                            </div>
                            <div className="text-center md:text-left">
                                <h1 className="text-3xl font-bold mb-3 text-white">{userProfile.nickname}</h1>
                                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                                    <span className="inline-flex items-center text-sm bg-gray-700 px-3 py-1 rounded-full text-gray-200">
                                        <svg
                                            className="w-4 h-4 text-[#FFB130] mr-1"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        매너점수 <span className="font-semibold ml-1">{userProfile.mannerScore}</span>
                                    </span>
                                </div>
                                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                    {userProfile.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 bg-[#FFB130] text-white rounded-full text-sm"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/my/profile/edit"
                            className="px-6 py-2.5 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors font-medium text-sm shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                            </svg>
                            프로필 수정
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#FFB130]/20 flex items-center justify-center">
                                    <svg
                                        className="w-6 h-6 text-[#FFB130]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-300 mb-1">평균 성공률</div>
                                    <div className="text-3xl font-bold text-white">
                                        {userProfile.stats.successRate}%
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#FFB130]/20 flex items-center justify-center">
                                    <svg
                                        className="w-6 h-6 text-[#FFB130]"
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
                                <div>
                                    <div className="text-sm text-gray-300 mb-1">평균 클리어</div>
                                    <div className="text-3xl font-bold text-white">
                                        {userProfile.stats.noHintSuccessRate}
                                        <span className="text-lg font-medium">분</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#FFB130]/20 flex items-center justify-center">
                                    <svg
                                        className="w-6 h-6 text-[#FFB130]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-300 mb-1">누적 방 수</div>
                                    <div className="text-3xl font-bold text-white">
                                        {userProfile.stats.totalCount}
                                        <span className="text-lg font-medium">개</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 2: 모임 희망 테마 */}
            <section className="py-16 bg-gray-900">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white">모임 희망 테마</h2>
                            <p className="text-gray-400 mt-1">내가 참여하고 싶은 테마들</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {wishThemes.map((theme) => (
                            <div
                                key={theme.id}
                                className="bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:translate-y-[-4px] duration-300 border border-gray-700 relative group"
                            >
                                <div className="aspect-[3/4] relative">
                                    <Image
                                        src={theme.thumbnailUrl || '/default-thumbnail.svg'}
                                        alt={theme.name || '테마'}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-white mb-2 line-clamp-1">{theme.name}</h3>
                                    <p className="text-sm text-gray-300 mb-3 line-clamp-1">{theme.storeName}</p>
                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <span className="px-2 py-1 bg-gray-700 rounded-md">{theme.runtime}분</span>
                                        <span>•</span>
                                        <span className="px-2 py-1 bg-gray-700 rounded-md">
                                            {theme.recommendedParticipants}인
                                        </span>
                                    </div>
                                </div>
                                {/* 호버 시 나타나는 버튼들 */}
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <Link
                                        href={`/themes/${theme.id}`}
                                        className="px-6 py-2.5 bg-[#FFB130] text-black rounded-full hover:bg-[#F0A120] transition-colors font-medium"
                                    >
                                        상세보기
                                    </Link>
                                    <button
                                        onClick={() => theme.id && handleDeleteTheme(theme.id)}
                                        className="px-6 py-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="bg-gray-800 rounded-2xl overflow-hidden border border-dashed border-gray-600 flex flex-col items-center justify-center p-6 min-h-[300px]">
                            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4 shadow-sm">
                                <svg
                                    className="w-8 h-8 text-[#FFB130]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                            </div>
                            <p className="text-gray-300 font-medium mb-2">새로운 테마 추가하기</p>
                            <p className="text-gray-400 text-sm text-center mb-4">관심있는 테마를 찾아보세요</p>
                            <button
                                onClick={() => setIsWishesModalOpen(true)}
                                className="px-4 py-2 bg-[#FFB130] text-black rounded-full text-sm hover:bg-[#F0A120] transition-colors"
                            >
                                테마 찾기
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: 나의 탈출일지 */}
            <section className="py-12 bg-gray-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">나의 탈출일지</h2>
                        <Link href="/my/diary" className="text-[#FFB130] hover:text-[#F0A120] transition-colors">
                            전체보기
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-700 rounded-lg p-6 h-[400px]">
                            <HistoryCalendar
                                selectedDate={selectedDate}
                                onChange={setSelectedDate}
                                markedDates={calendarDiaries
                                    .filter(
                                        (diary): diary is CalendarDiary & { escapeDate: string } =>
                                            diary.escapeDate !== undefined,
                                    )
                                    .map((diary) => new Date(diary.escapeDate))}
                                onMonthChange={(date) => {
                                    fetchCalendarDiaries(date)
                                }}
                            />
                        </div>
                        <div className="bg-gray-700 rounded-lg p-6 h-[400px]">
                            {selectedDate ? (
                                <div className="space-y-4 h-full">
                                    <div className="text-lg font-medium mb-4 text-white">
                                        {selectedDate.toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </div>
                                    <div className="h-[calc(100%-40px)] overflow-y-auto pr-2">
                                        {calendarDiaries
                                            .filter(
                                                (diary): diary is CalendarDiary & { escapeDate: string } =>
                                                    diary.escapeDate !== undefined &&
                                                    new Date(diary.escapeDate).toDateString() ===
                                                        selectedDate.toDateString(),
                                            )
                                            .map((diary) => (
                                                <div
                                                    key={diary.id}
                                                    className="block bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-600 mb-4 relative overflow-hidden group"
                                                >
                                                    <div className="h-[200px] relative">
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
                                                        {/* 테마 정보 오버레이 */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end p-4">
                                                            <h3 className="font-medium text-lg mb-2 text-white">
                                                                {diary.themeName}
                                                            </h3>
                                                            <p className="text-sm text-gray-300">{diary.storeName}</p>
                                                            <div className="flex flex-wrap gap-2 my-2">
                                                                {diary.tags?.map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="px-3 py-1 bg-[#FFB130] text-white text-xs rounded-full"
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-between items-center mt-2">
                                                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                                                    <span>
                                                                        탈출 시간:{' '}
                                                                        {diary.elapsedTime
                                                                            ? `${Math.floor(
                                                                                  diary.elapsedTime / 60,
                                                                              )}분 ${diary.elapsedTime % 60}초`
                                                                            : '기록 없음'}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>힌트: {diary.hintCount || 0}회</span>
                                                                </div>
                                                                <span
                                                                    className={`px-3 py-1 text-sm rounded-full backdrop-blur-sm ${
                                                                        diary.escapeResult
                                                                            ? 'bg-green-900/70 text-green-300'
                                                                            : 'bg-red-900/70 text-red-300'
                                                                    }`}
                                                                >
                                                                    {diary.escapeResult ? '성공' : '실패'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* 버튼 오버레이 - 호버 시 표시 */}
                                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                            <Link
                                                                href={`/my/diary/${diary.id}`}
                                                                className="px-6 py-2.5 bg-[#FFB130] text-black rounded-full hover:bg-[#F0A120] transition-colors font-medium"
                                                            >
                                                                상세보기
                                                            </Link>
                                                            <Link
                                                                href={`/my/diary/new`}
                                                                className="px-6 py-2.5 bg-white text-black rounded-full hover:bg-gray-100 transition-colors font-medium"
                                                            >
                                                                후기작성
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    날짜를 선택하면 해당 날짜의 탈출일지를 볼 수 있습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: 나의 모임 히스토리 */}
            <section className="py-12 bg-gray-900">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">나의 모임 히스토리</h2>
                        <Link href="/my/history" className="text-[#FFB130] hover:text-[#F0A120] transition-colors">
                            전체보기
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {partyHistories
                            .filter(
                                (party): party is PartyHistory & { scheduledAt: string } =>
                                    party.scheduledAt !== undefined,
                            )
                            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                            .slice(0, 2)
                            .map((party) => (
                                <div
                                    key={party.partyId}
                                    className="bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-700"
                                >
                                    <div className="p-6">
                                        <div className="flex gap-4 relative">
                                            <div className="w-24 h-24 bg-gray-700 rounded-lg flex-shrink-0 relative">
                                                <Image
                                                    src={(party as any)?.thumbnailUrl || '/default-thumbnail.svg'}
                                                    alt={party?.title || '파티 썸네일'}
                                                    fill
                                                    className="object-cover rounded-lg"
                                                    unoptimized
                                                    onError={(e) => {
                                                        const fallbackImage = '/default-thumbnail.svg'
                                                        ;(e.target as HTMLImageElement).src = fallbackImage
                                                        ;(e.target as HTMLImageElement).onerror = null
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-medium mb-1 text-white">{party.title}</h3>
                                                <p className="text-sm text-gray-300 mb-2">{party.themeName}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <span>{party.storeName}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {new Date(party.scheduledAt).toLocaleDateString('ko-KR')}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {party.acceptedParticipantsCount}/{party.totalParticipants}인
                                                        참여
                                                    </span>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/my/diary/new`}
                                                className="absolute top-0 right-0 px-3 py-1.5 bg-[#FFB130] text-black text-sm rounded-lg hover:bg-[#F0A120] transition-colors"
                                            >
                                                후기작성
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </section>

            {/* WishesThemesModal */}
            <WishesThemesModal isOpen={isWishesModalOpen} onClose={() => setIsWishesModalOpen(false)} />
        </main>
    )
}
