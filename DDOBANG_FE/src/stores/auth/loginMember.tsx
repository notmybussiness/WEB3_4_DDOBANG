'use client'

import { createContext, use, useState } from 'react'

import { useRouter } from 'next/navigation'

import client from '@/lib/backend/client'

import { components } from '@/lib/backend/apiV1/schema'

type Member = components['schemas']['BasicProfileResponse']

export const LoginMemberContext = createContext<{
    loginMember: Member
    setLoginMember: (member: Member) => void
    isLoginMemberPending: boolean
    isLogin: boolean
    logout: (callback: () => void) => void
    logoutAndHome: () => void
}>({
    loginMember: {
        nickname: '',
        gender: 'BLIND',
        introduction: '',
        profilePictureUrl: undefined,
        mannerScore: undefined,
    },
    setLoginMember: () => {},
    isLoginMemberPending: true,
    isLogin: false,
    logout: (callback: () => void) => {},
    logoutAndHome: () => {},
})

function createEmptyMember(): Member {
    return {
        nickname: '',
        gender: 'BLIND',
        introduction: '',
        profilePictureUrl: undefined,
        mannerScore: undefined,
    }
}

export function useLoginMember() {
    const router = useRouter()

    const [isLoginMemberPending, setLoginMemberPending] = useState(true)
    const [loginMember, _setLoginMember] = useState<Member>(createEmptyMember())

    const removeLoginMember = () => {
        _setLoginMember(createEmptyMember())
        setLoginMemberPending(false)
    }

    const setLoginMember = (member: Member) => {
        _setLoginMember(member)
        setLoginMemberPending(false)
    }

    const setNoLoginMember = () => {
        setLoginMemberPending(false)
    }

    const isLogin = loginMember.nickname !== '' && loginMember.nickname !== undefined

    const logout = (callback: () => void) => {
        client.POST('/api/v1/auth/logout', {}).then(() => {
            removeLoginMember()
            callback()
        })
    }

    const logoutAndHome = () => {
        logout(() => router.replace('/'))
    }

    return {
        loginMember,
        setLoginMember,
        isLoginMemberPending,
        setNoLoginMember,
        isLogin,
        logout,
        logoutAndHome,
    }
}

export function useGlobalLoginMember() {
    return use(LoginMemberContext)
}
