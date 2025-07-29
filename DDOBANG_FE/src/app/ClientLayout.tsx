'use client'

import { PageLoading } from '@/components/common/PageLoading'
import { Navigation } from '@/components/layout/Navigation'
import { Notification } from '@/components/layout/SseConnector'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { LoginMemberContext, useLoginMember } from '@/stores/auth/loginMember'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import React, { useEffect, useState } from 'react'

type AlarmResponse = components['schemas']['AlarmResponse']

// 알림 컨텍스트 생성
export const NotificationContext = React.createContext<{
    notifications: AlarmResponse[]
    addNotification: (notification: AlarmResponse) => void
    clearNotifications: () => void
    unreadCount: number
    setUnreadCount: (count: number | ((prev: number) => number)) => void
}>({
    notifications: [],
    addNotification: () => {},
    clearNotifications: () => {},
    unreadCount: 0,
    setUnreadCount: () => {},
})

export function ClientLayout({ children }: React.ComponentProps<typeof NextThemesProvider>) {
    const { loginMember, setLoginMember, isLoginMemberPending, setNoLoginMember, isLogin, logout, logoutAndHome } =
        useLoginMember()

    const [notifications, setNotifications] = useState<AlarmResponse[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const loginMemberContextValue = {
        loginMember,
        setLoginMember,
        isLoginMemberPending,
        setNoLoginMember,
        isLogin,
        logout,
        logoutAndHome,
    }

    const notificationContextValue = {
        notifications,
        addNotification: (notification: AlarmResponse) => {
            if (!notification) return
            setNotifications((prev) => [notification, ...prev])
            if (notification.readStatus === false) {
                setUnreadCount((prev) => prev + 1)
            }
        },
        clearNotifications: () => {
            setNotifications([])
            setUnreadCount(0)
        },
        unreadCount,
        setUnreadCount,
    }

    const fetchMember = () => {
        client
            .GET('/api/v1/members/me', {})
            .then((res) => {
                if (res.error) {
                    // 로그인되지 않은 상태로 처리
                    setNoLoginMember()
                    return
                }
                // API 응답에서 data 필드의 멤버 정보를 추출
                if (res.data && res.data.data) {
                    setLoginMember(res.data.data)
                } else {
                    setNoLoginMember()
                }
            })
            .catch((error) => {
                // 에러 발생 시 (302 포함) 로그인되지 않은 상태로 처리
                setNoLoginMember()
            })
    }

    useEffect(() => {
        fetchMember()
    }, [])

    if (isLoginMemberPending) {
        return <PageLoading isLoading={true} />
    }

    return (
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <LoginMemberContext value={loginMemberContextValue}>
                <NotificationContext.Provider value={notificationContextValue}>
                    <Notification onNotification={notificationContextValue.addNotification} />
                    <Navigation />
                    <main>{children}</main>
                </NotificationContext.Provider>
            </LoginMemberContext>
        </NextThemesProvider>
    )
}
