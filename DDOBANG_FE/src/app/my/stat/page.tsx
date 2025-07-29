'use client'

import { PageLoading } from '@/components/common/PageLoading'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { LoginMemberContext } from '@/stores/auth/loginMember'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'

// 차트 컴포넌트
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

// 통계 데이터 인터페이스
type StatData = components['schemas']['MemberStatResponse']
type ApiResponse = components['schemas']['SuccessResponseMemberStatResponse']

// 색상 정의
const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#9896f1', '#f9ca66', '#e5e5e5']
const GENRE_COLORS = {
    공포: '#ff6b6b',
    추리: '#4ecdc4',
    스릴: '#45b7d1',
    SF: '#9896f1',
    판타지: '#f9ca66',
    기타: '#e5e5e5',
}

// 성향 매핑
const TENDENCY_MAP = {
    tendencyStimulating: '자극성',
    tendencyNarrative: '스토리',
    tendencySpatial: '인테리어',
    tendencyActive: '활동성',
    tendencyLogical: '추론',
}

export default function StatPage() {
    const router = useRouter()
    const { loginMember, isLogin } = useContext(LoginMemberContext)
    const [loading, setLoading] = useState(true)
    const [statData, setStatData] = useState<StatData | null>(null)

    useEffect(() => {
        if (!isLogin) {
            router.push('/login')
            return
        }

        // 통계 데이터 가져오기
        const fetchStatData = async () => {
            setLoading(true)
            try {
                // API 호출
                const response = await client.GET('/api/v1/members/stat')
                if (response.data) {
                    setStatData(response.data.data as StatData)
                }
            } catch (error) {
                console.error('통계 데이터 로딩 중 오류:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStatData()
    }, [isLogin, router])

    if (loading) {
        return (
            <div className="bg-gray-900 min-h-screen">
                <PageLoading isLoading={true} />
            </div>
        )
    }

    if (!statData) {
        return (
            <div className="bg-gray-900 min-h-screen">
                <div className="max-w-7xl mx-auto p-6">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-sm text-center">
                        <h1 className="text-2xl font-bold mb-4 text-white">통계를 불러올 수 없습니다</h1>
                        <p className="text-gray-300 mb-6">탈출일지를 작성하시면 통계가 생성됩니다.</p>
                        <button
                            onClick={() => router.push('/my/diary/new')}
                            className="px-6 py-2 bg-[#FFB130] text-black rounded-md"
                        >
                            탈출일지 작성하기
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 min-h-screen pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">방탈출 통계 대시보드</h1>
                    <p className="text-gray-300 text-sm">당신이 방탈출 여행을 한눈에 확인하세요.</p>
                </div>

                {/* 상단 카드 - 주요 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-gray-300 text-sm">총 방탈출 횟수</p>
                                <h2 className="text-3xl font-bold text-white">{statData.totalCount}</h2>
                            </div>
                            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                <Image
                                    src="/icon/count-icon.svg"
                                    alt="방 아이콘"
                                    width={24}
                                    height={24}
                                    className="opacity-60"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">
                            탈출 성공률 <span className="text-[#4ecdc4] font-semibold">{statData.successRate}%</span>
                        </p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-gray-300 text-sm">노힌트 클리어</p>
                                <h2 className="text-3xl font-bold text-white">{statData.noHintSuccessCount}</h2>
                            </div>
                            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                <Image
                                    src="/icon/star-icon.svg"
                                    alt="별 아이콘"
                                    width={24}
                                    height={24}
                                    className="opacity-60"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">
                            노힌트 성공률{' '}
                            <span className="text-[#4ecdc4] font-semibold">{statData.noHintSuccessRate}%</span>
                        </p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-gray-300 text-sm">힌트 평균 사용</p>
                                <h2 className="text-3xl font-bold text-white">{statData.averageHintCount}</h2>
                            </div>
                            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                <Image
                                    src="/icon/hint-icon.svg"
                                    alt="전구 아이콘"
                                    width={24}
                                    height={24}
                                    className="opacity-60"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">&nbsp;</p>
                    </div>
                </div>

                {/* 장르별 진행 비율 & 장르별 성공/실패 비율 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 text-white">장르별 진행 비율</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={Object.entries(statData.genreCountMap ?? {}).map(([name, value]) => ({
                                            name,
                                            value,
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={0}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {Object.entries(statData.genreCountMap ?? {}).map(([name, value], index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    GENRE_COLORS[name as keyof typeof GENRE_COLORS] ||
                                                    COLORS[index % COLORS.length]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value}%`, '비율']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 text-white">장르별 성공/실패 비율</h3>
                        <p className="text-xs text-gray-400 mb-4">참여 비율 상위 5개 장르만 표시합니다.</p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={Object.entries(statData.genreSuccessMap ?? {}).map(([genre, success]) => ({
                                        genre,
                                        success,
                                    }))}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                    <YAxis dataKey="genre" type="category" width={80} />
                                    <Tooltip formatter={(value) => [`${value}%`, '']} />
                                    <Legend />
                                    <Bar dataKey="success" name="성공" stackId="a" fill="#4ecdc4" />
                                    <Bar dataKey="fail" name="실패" stackId="a" fill="#ff6b6b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 성향 분석 & 월별 방탈출 장소 수와 평균 용맹 지수 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 text-white">
                            성향 분석 <span className="text-gray-400 text-sm">ⓘ</span>
                        </h3>
                        <div className="relative h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="70%"
                                    data={Object.entries(statData.tendencyMap ?? {}).map(([key, value]) => ({
                                        subject: TENDENCY_MAP[key as keyof typeof TENDENCY_MAP] || key,
                                        value: value * 10,
                                        fullMark: 50,
                                    }))}
                                >
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 50]} />
                                    <Radar
                                        name="사용자"
                                        dataKey="value"
                                        stroke="#8884d8"
                                        fill="#8884d8"
                                        fillOpacity={0.6}
                                    />
                                    <Tooltip formatter={(value) => [`${value}점`, '']} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 text-white">월별 방탈출 장소 수와 평균 용맹 지수</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={Object.entries(statData.monthlyCountMap ?? {}).map(([month, count]) => ({
                                        month,
                                        count,
                                    }))}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis domain={[0, 8]} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 통계 카드 행 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm text-center">
                        <p className="text-gray-300 text-sm mb-1">첫 방탈출</p>
                        <p className="text-xl font-semibold text-white">{statData.firstEscapeDate}</p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm text-center">
                        <p className="text-gray-300 text-sm mb-1">최근 방탈출</p>
                        <p className="text-xl font-semibold text-[#FFB130]">
                            {statData.lastMonthInfo?.lastMonthTopTheme}
                        </p>
                        <p className="text-xs text-gray-400">활동 중</p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm text-center">
                        <p className="text-gray-300 text-sm mb-1">방탈출을 사랑한 지</p>
                        <p className="text-xl font-semibold text-white">{statData.daysSinceFirstEscape}일 째</p>
                    </div>
                </div>

                {/* 최근 방탈출 활동 */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
                    <h3 className="text-lg font-semibold mb-6 text-white">최근 방탈출 활동</h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                        <div className="text-center">
                            <div className="mb-2">
                                <Image
                                    src="/icon/count-icon.svg"
                                    alt="참여 테마 수"
                                    width={36}
                                    height={36}
                                    className="mx-auto"
                                />
                            </div>
                            <p className="text-gray-300 text-xs">참여 테마 수</p>
                            <p className="text-lg font-semibold text-white">{statData.mostActiveMonthCount}개</p>
                        </div>

                        <div className="text-center">
                            <div className="mb-2">
                                <Image
                                    src="/icon/star-icon.svg"
                                    alt="평균 만족도"
                                    width={36}
                                    height={36}
                                    className="mx-auto"
                                />
                            </div>
                            <p className="text-gray-300 text-xs">평균 만족도</p>
                            <p className="text-lg font-semibold text-white">
                                {statData.lastMonthInfo?.lastMonthAvgSatisfaction}/5.0
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="mb-2">
                                <Image
                                    src="/icon/bulb-icon.svg"
                                    alt="평균 힌트 사용"
                                    width={36}
                                    height={36}
                                    className="mx-auto"
                                />
                            </div>
                            <p className="text-gray-300 text-xs">평균 힌트 사용</p>
                            <p className="text-lg font-semibold text-white">
                                {statData.lastMonthInfo?.lastMonthAvgHintCount}개
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="mb-2">
                                <Image
                                    src="/icon/check-icon.svg"
                                    alt="탈출 성공률"
                                    width={36}
                                    height={36}
                                    className="mx-auto"
                                />
                            </div>
                            <p className="text-gray-300 text-xs">탈출 성공률</p>
                            <p className="text-lg font-semibold text-white">
                                {statData.lastMonthInfo?.lastMonthSuccessRate}%
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="mb-2">
                                <Image
                                    src="/icon/clock-icon.svg"
                                    alt="평균 소요 시간"
                                    width={36}
                                    height={36}
                                    className="mx-auto"
                                />
                            </div>
                            <p className="text-gray-300 text-xs">평균 소요 시간</p>
                            <p className="text-lg font-semibold text-white">
                                {statData.lastMonthInfo?.lastMonthAvgTime}분
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="mb-2">
                                <Image
                                    src="/icon/trophy-icon.svg"
                                    alt="최고 전적 대비"
                                    width={36}
                                    height={36}
                                    className="mx-auto"
                                />
                            </div>
                            <p className="text-gray-300 text-xs">최고 전적 대비</p>
                            <p className="text-lg font-semibold text-[#4ecdc4]">
                                {statData.lastMonthInfo?.lastMonthTopTheme}
                            </p>
                            <p className="text-[10px] text-gray-400">4/5</p>
                        </div>
                    </div>
                </div>

                {/* 난이도별 방탈출 사용 패턴 & 난이도와 만족도 상관관계 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 text-white">난이도별 힌트 사용 패턴</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={Object.entries(statData.difficultyHintAvgMap ?? {}).map(([name, value]) => ({
                                        name,
                                        value,
                                    }))}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 5]} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" name="평균 힌트 사용" stroke="#8884d8" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            난이도가 높을수록 힌트 사용량이 증가하는 경향이 있습니다.
                        </p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 text-white">난이도와 만족도 상관관계</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={Object.entries(statData.difficultySatisAvgMap ?? {}).map(([name, value]) => ({
                                        name,
                                        value,
                                    }))}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 5]} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="평균 만족도" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            난이도와 상관없이 점차 만족도가 높아지는 것으로 보입니다.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            난이도가 높아질수록 플레이 경험이 향상되는 경향이 있습니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
