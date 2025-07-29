'use client'

import { NotificationContext } from '@/app/ClientLayout'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { useGlobalLoginMember } from '@/stores/auth/loginMember'
import { useRouter } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'

type AlarmType = components['schemas']['AlarmCreateRequest']['alarmType']
type AlarmResponse = components['schemas']['AlarmResponse']
type AlarmCountResponse = components['schemas']['AlarmCountResponse']

interface PageDto<T> {
    items: T[]
    totalItems: number
    totalPages: number
    pageSize: number
    currentPageNumber: number
}

interface NotificationProps {
    onNewNotification?: (notification: AlarmResponse) => void
}

export function Notification({ onNewNotification }: NotificationProps) {
    const router = useRouter()
    const { isLogin } = useGlobalLoginMember()
    const { setUnreadCount } = useContext(NotificationContext)
    const [alarms, setAlarms] = useState<AlarmResponse[]>([])
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(false)

    const checkUnreadCount = async () => {
        if (!isLogin) return

        try {
            const response = await client.GET('/alarms/count')
            if (response.data?.data) {
                const countData = response.data.data as AlarmCountResponse
                setUnreadCount(countData.unreadCount ?? 0)
            }
        } catch (error) {
            console.error('알림 개수 조회 실패:', error)
        }
    }

    const handleNewNotification = (notification: AlarmResponse) => {
        if (!notification) return

        setAlarms((prev) => [notification, ...prev])
        if (onNewNotification) {
            onNewNotification(notification)
        }
        if (notification.readStatus === false) {
            setUnreadCount((prev: number) => prev + 1)
        }
    }

    useEffect(() => {
        if (isLogin) {
            fetchAlarms(0)
            checkUnreadCount()
            setPage(0)
        }
    }, [isLogin])

    const markAsRead = async (id: number) => {
        if (!id) return

        try {
            await client.PATCH('/alarms/{id}/read', {
                params: {
                    path: {
                        id,
                    },
                },
            })
            setAlarms((prev) => prev.map((alarm) => (alarm.id === id ? { ...alarm, readStatus: true } : alarm)))
            setUnreadCount((prev: number) => Math.max(0, prev - 1))
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            await client.PATCH('/alarms/read-all', {})
            setAlarms((prev) => prev.map((alarm) => ({ ...alarm, readStatus: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('전체 알림 읽음 처리 실패:', error)
        }
    }

    const fetchAlarms = async (pageNumber: number) => {
        if (!isLogin) return

        try {
            setLoading(true)
            const response = await client.GET('/alarms', {
                params: {
                    query: {
                        pageable: {
                            page: pageNumber,
                            size: 10,
                        },
                    },
                },
            })

            console.log('알림 목록:', response.data)

            if (response.data?.data) {
                const pageData = response.data.data as PageDto<AlarmResponse>
                setAlarms(pageData.items ?? [])
                setTotalPages(pageData.totalPages ?? 0)
            }
        } catch (error) {
            console.error('알림 목록 조회 실패:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        fetchAlarms(newPage)
    }

    const handleAlarmClick = async (alarm: AlarmResponse) => {
        if (!alarm?.id) return

        try {
            // 알림 읽음 처리
            await client.PATCH('/alarms/{id}/read', {
                params: {
                    path: {
                        id: alarm.id,
                    },
                },
            })

            // 알림 상태 업데이트
            setAlarms((prev) => prev.map((a) => (a.id === alarm.id ? { ...a, readStatus: true } : a)))
            setUnreadCount((prev: number) => Math.max(0, prev - 1))

            const response = await client.GET('/alarms/{id}/redirect', {
                params: {
                    path: {
                        id: alarm.id,
                    },
                },
            })

            if (response.data?.data) {
                const redirectUrl = response.data.data as string
                if (redirectUrl) {
                    router.push(redirectUrl)
                }
            }
        } catch (error) {
            console.error('알림 처리 실패:', error)
        }
    }

    const handleDeleteAlarm = async (alarmId: number) => {
        if (!alarmId) return

        try {
            await client.DELETE('/alarms/{id}', {
                params: {
                    path: {
                        id: alarmId,
                    },
                },
            })
            setAlarms((prev) => prev.filter((a) => a.id !== alarmId))
        } catch (error) {
            console.error('알림 삭제 실패:', error)
        }
    }

    const getAlarmTypeLabel = (alarmType: AlarmType | undefined) => {
        if (!alarmType) return '기타'

        switch (alarmType) {
            case 'SYSTEM':
                return '시스템'
            case 'MESSAGE':
                return '메시지'
            case 'SUBSCRIBE':
                return '구독'
            case 'PARTY_APPLY':
                return '모임신청'
            case 'PARTY_STATUS':
                return '모임상태'
            case 'ANSWER_COMMENT':
                return '답변'
            case 'POST_REPLY':
                return '문의답변'
            default:
                return '기타'
        }
    }

    const getAlarmTypeStyle = (alarmType: AlarmType | undefined) => {
        if (!alarmType) return 'bg-gray-100 text-gray-600'

        switch (alarmType) {
            case 'SYSTEM':
                return 'bg-orange-100 text-orange-600'
            case 'MESSAGE':
                return 'bg-blue-100 text-blue-600'
            case 'SUBSCRIBE':
                return 'bg-green-100 text-green-600'
            case 'PARTY_APPLY':
                return 'bg-purple-100 text-purple-600'
            case 'PARTY_STATUS':
                return 'bg-indigo-100 text-indigo-600'
            case 'ANSWER_COMMENT':
                return 'bg-pink-100 text-pink-600'
            case 'POST_REPLY':
                return 'bg-teal-100 text-teal-600'
            default:
                return 'bg-gray-100 text-gray-600'
        }
    }

    if (!isLogin) {
        return null
    }

    return (
        <>
            <div className="max-h-96 overflow-y-auto pb-12">
                {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <>
                        {alarms.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">알림이 없습니다.</div>
                        ) : (
                            alarms.map((alarm) => (
                                <div
                                    key={alarm.id}
                                    className={`px-4 py-3 border-b border-gray-100 ${
                                        alarm.readStatus === false ? 'bg-[#FFE4C4]' : ''
                                    } cursor-pointer hover:bg-gray-50`}
                                    onClick={() => handleAlarmClick(alarm)}
                                >
                                    <div className="flex items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full ${getAlarmTypeStyle(
                                                        alarm.alarmType,
                                                    )}`}
                                                >
                                                    {getAlarmTypeLabel(alarm.alarmType)}
                                                </span>
                                                <span className="ml-auto flex items-center gap-1">
                                                    {alarm.readStatus === true ? (
                                                        <span className="text-[#FFB230] text-xs flex items-center">
                                                            <svg
                                                                className="w-4 h-4 mr-1"
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
                                                            읽음
                                                        </span>
                                                    ) : null}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (alarm.id) {
                                                                handleDeleteAlarm(alarm.id)
                                                            }
                                                        }}
                                                        className="ml-1 text-gray-400 hover:text-red-500 text-xs"
                                                        title="알림 삭제"
                                                    >
                                                        <svg
                                                            className="w-4 h-4"
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
                                                    </button>
                                                </span>
                                            </div>
                                            <h4 className="font-medium mt-1">{alarm.title}</h4>
                                            <p className="text-sm text-gray-500 mt-1">{alarm.content}</p>
                                            <div className="flex justify-end mt-2">
                                                <span className="text-xs text-gray-400">
                                                    {alarm.createdAt
                                                        ? new Date(alarm.createdAt).toLocaleDateString('ko-KR', {
                                                              year: 'numeric',
                                                              month: 'long',
                                                              day: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 py-2 border-t border-gray-100 bg-[#FFF8EC] rounded-b-lg">
                <div className="flex justify-between items-center">
                    <button
                        onClick={markAllAsRead}
                        className="text-sm text-gray-600 hover:text-gray-900"
                        disabled={alarms.every((alarm) => alarm.readStatus === true)}
                    >
                        전체 읽음 처리
                    </button>
                    <div className="flex space-x-2">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => handlePageChange(i)}
                                className={`w-8 h-8 rounded-full text-sm ${
                                    page === i
                                        ? 'bg-[#FFB230] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
