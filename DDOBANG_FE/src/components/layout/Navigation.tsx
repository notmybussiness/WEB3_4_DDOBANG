'use client'

import { NotificationContext } from '@/app/ClientLayout'
import { Notification } from '@/components/layout/Notification'
import { useGlobalLoginMember } from '@/stores/auth/loginMember'
import Image from 'next/image'
import Link from 'next/link'
import { useContext, useEffect, useRef, useState } from 'react'

export function Navigation({ activePage }: { activePage?: string }) {
    const { isLogin, loginMember, logoutAndHome } = useGlobalLoginMember()
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const [isNotificationOpen, setIsNotificationOpen] = useState(false)
    const { unreadCount } = useContext(NotificationContext)

    // 드롭다운 요소에 대한 참조 추가
    const profileMenuRef = useRef<HTMLDivElement>(null)
    const notificationMenuRef = useRef<HTMLDivElement>(null)
    const profileButtonRef = useRef<HTMLButtonElement>(null)
    const notificationButtonRef = useRef<HTMLButtonElement>(null)

    // 외부 클릭 감지를 위한 이벤트 리스너 추가
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // 프로필 메뉴가 열려있고, 클릭이 프로필 메뉴 외부에서 발생했을 때
            if (
                isProfileMenuOpen &&
                profileMenuRef.current &&
                profileButtonRef.current &&
                !profileMenuRef.current.contains(event.target as Node) &&
                !profileButtonRef.current.contains(event.target as Node)
            ) {
                setIsProfileMenuOpen(false)
            }

            // 알림 메뉴가 열려있고, 클릭이 알림 메뉴 외부에서 발생했을 때
            if (
                isNotificationOpen &&
                notificationMenuRef.current &&
                notificationButtonRef.current &&
                !notificationMenuRef.current.contains(event.target as Node) &&
                !notificationButtonRef.current.contains(event.target as Node)
            ) {
                setIsNotificationOpen(false)
            }
        }

        // 문서에 클릭 이벤트 리스너 추가
        document.addEventListener('mousedown', handleClickOutside)

        // 컴포넌트가 언마운트될 때 이벤트 리스너 제거
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isProfileMenuOpen, isNotificationOpen])

    const toggleProfileMenu = () => {
        setIsProfileMenuOpen(!isProfileMenuOpen)
        if (isNotificationOpen) setIsNotificationOpen(false)
    }

    const toggleNotification = () => {
        setIsNotificationOpen(!isNotificationOpen)
        if (isProfileMenuOpen) setIsProfileMenuOpen(false)
    }

    return (
        <nav className="bg-black z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-12">
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="flex items-center">
                            <Image src="/logo.svg" alt="도망" width={78} height={33} priority />
                        </Link>
                        <div className="flex space-x-6">
                            <Link
                                href="/themes"
                                className={`${
                                    activePage === 'themes' ? 'text-[#FFD896]' : 'text-gray-300 hover:text-[#FFD896]'
                                } text-base font-bold`}
                            >
                                방탈출 테마
                            </Link>
                            <Link
                                href="/parties"
                                className={`${
                                    activePage === 'parties' ? 'text-[#FFD896]' : 'text-gray-300 hover:text-[#FFD896]'
                                } text-base font-bold`}
                            >
                                모임 탐색
                            </Link>
                            {isLogin && (
                                <Link
                                    href="/my/diary"
                                    className={`${
                                        activePage === 'my-diary'
                                            ? 'text-[#FFD896]'
                                            : 'text-gray-300 hover:text-[#FFD896]'
                                    } text-base font-bold`}
                                >
                                    나의 탈출일지
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {isLogin ? (
                            <>
                                <div className="relative">
                                    <button
                                        ref={notificationButtonRef}
                                        onClick={toggleNotification}
                                        className="text-gray-300 hover:text-[#FFD896]"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                            />
                                        </svg>
                                        {unreadCount > 0 && (
                                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                                        )}
                                    </button>

                                    {isNotificationOpen && (
                                        <div
                                            ref={notificationMenuRef}
                                            className="absolute right-0 -mt-1 w-80 bg-[#FFF8EC] rounded-lg shadow-lg py-2 z-50"
                                        >
                                            <div className="flex items-center px-4 py-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[#FFB230] text-xl font-bold">알림</span>
                                                </div>
                                            </div>
                                            <Notification />
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        ref={profileButtonRef}
                                        onClick={toggleProfileMenu}
                                        className="flex items-center space-x-2 hover:opacity-80"
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden relative bg-gray-700 flex items-center justify-center">
                                            {loginMember && (
                                                <Image
                                                    src={loginMember.profilePictureUrl || '/default-profile.svg'}
                                                    alt={loginMember.nickname || '프로필 이미지'}
                                                    className="w-full h-full object-cover"
                                                    width={32}
                                                    height={32}
                                                />
                                            )}
                                        </div>
                                        <span className="text-gray-300 text-sm font-medium">
                                            {loginMember?.nickname || '사용자'}
                                        </span>
                                    </button>

                                    {isProfileMenuOpen && (
                                        <div
                                            ref={profileMenuRef}
                                            className="absolute right-0 -mt-1 w-48 bg-[#FFF8EC] rounded-lg shadow-lg py-1 z-50"
                                        >
                                            <Link
                                                href="/my/profile"
                                                className="block px-4 py-3 text-base font-medium text-gray-500 hover:bg-[#FFFCF7]"
                                            >
                                                마이페이지
                                            </Link>
                                            <Link
                                                href="/my/history"
                                                className="block px-4 py-3 text-base font-medium text-gray-500 hover:bg-[#FFFCF7]"
                                            >
                                                모임 히스토리
                                            </Link>
                                            <Link
                                                href="/my/messages"
                                                className="block px-4 py-3 text-base font-medium text-gray-500 hover:bg-[#FFFCF7]"
                                            >
                                                쪽지함
                                            </Link>
                                            <Link
                                                href="/my/stat"
                                                className="block px-4 py-3 text-base font-medium text-gray-500 hover:bg-[#FFFCF7]"
                                            >
                                                통계
                                            </Link>
                                            <Link
                                                href="/my/inquiry"
                                                className="block px-4 py-3 text-base font-medium text-gray-500 hover:bg-[#FFFCF7]"
                                            >
                                                1:1 문의
                                            </Link>
                                            <div className="border-t border-gray-100">
                                                <button
                                                    onClick={logoutAndHome}
                                                    className="block w-full text-left px-4 py-3 text-base font-medium text-gray-500 hover:bg-[#FFFCF7]"
                                                >
                                                    로그아웃
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="flex items-center gap-2 text-[#FFB130] hover:text-[#FFA000] transition-colors mr-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                    />
                                </svg>
                                로그인
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
