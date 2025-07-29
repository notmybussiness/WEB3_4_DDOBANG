'use client'

import type { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { useGlobalLoginMember } from '@/stores/auth/loginMember'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Message = components['schemas']['MessageDto']
type ApiResponse = components['schemas']['SuccessResponseSliceDtoMessageDto']

export default function MessagesPage() {
    const { loginMember } = useGlobalLoginMember()
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
    const [selectedMessages, setSelectedMessages] = useState<number[]>([])
    const [selectAll, setSelectAll] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [hasNext, setHasNext] = useState(false)
    const [cursor, setCursor] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState('')
    const [isSending, setIsSending] = useState(false)
    const searchParams = useSearchParams()
    const messageId = searchParams.get('messageId')

    // 메시지 데이터 가져오기
    const fetchMessages = async (newCursor: string | null = null) => {
        setIsLoading(true)
        setError(null)

        try {
            const endpoint = activeTab === 'received' ? '/messages/received' : '/messages/sent'
            const response = await client.GET(endpoint, {
                params: {
                    query: {
                        cursor: newCursor || undefined,
                        size: 10,
                    },
                },
            })

            if (response.data?.data) {
                const newMessages = response.data.data.content
                if (Array.isArray(newMessages)) {
                    setMessages((prev) => (newCursor ? [...prev, ...newMessages] : newMessages))
                    setHasNext(response.data.data.hasNext ?? false)
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage?.createdAt) {
                        setCursor(lastMessage.createdAt)
                    }
                }
            }
        } catch (error) {
            console.error('메시지 조회 실패:', error)
            setError('메시지를 불러오는데 실패했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    // 탭 변경 시 메시지 다시 로드
    useEffect(() => {
        if (loginMember) {
            setMessages([])
            setCursor(null)
            fetchMessages()
        }
    }, [activeTab, loginMember])

    // URL에서 messageId가 제공된 경우 해당 메시지를 찾아서 열기
    useEffect(() => {
        if (messageId && messages.length > 0) {
            const targetMessage = messages.find((msg) => msg.id === Number(messageId))
            if (targetMessage) {
                handleOpenMessage(targetMessage)
            }
        }
    }, [messageId, messages])

    // 전체 선택 핸들러
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedMessages([])
        } else {
            const messageIds = messages.map((msg) => msg.id).filter((id): id is number => id !== undefined)
            setSelectedMessages(messageIds)
        }
        setSelectAll(!selectAll)
    }

    // 개별 선택 핸들러
    const handleSelectMessage = (id: Message['id']) => {
        if (id === undefined) return
        setSelectedMessages((prev) => {
            if (prev.includes(id)) {
                return prev.filter((msgId) => msgId !== id)
            } else {
                return [...prev, id]
            }
        })
    }

    // 메시지 상세 보기 및 읽음 처리
    const handleOpenMessage = async (message: Message) => {
        const messageId = message.id
        if (messageId === undefined) return

        setSelectedMessage(message)
        setIsModalOpen(true)

        // 받은 쪽지함에서만 읽음 상태 업데이트
        if (activeTab === 'received') {
            try {
                await client.PATCH('/messages/{id}/read', {
                    params: {
                        path: {
                            id: messageId,
                        },
                    },
                })

                // 메시지 목록 업데이트
                setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, read: true } : msg)))
            } catch (error) {
                console.error('읽음 상태 업데이트 실패:', error)
            }
        }
    }

    // 여러 메시지 읽음 처리
    const handleMarkAsRead = async () => {
        if (selectedMessages.length === 0 || activeTab !== 'received') return

        try {
            // 각 선택된 메시지에 대해 읽음 처리 API 호출
            await Promise.all(
                selectedMessages.map((id) =>
                    client.PATCH('/messages/{id}/read', {
                        params: {
                            path: {
                                id,
                            },
                        },
                    }),
                ),
            )

            // 메시지 목록 업데이트
            setMessages((prev) =>
                prev.map((msg) => (selectedMessages.includes(msg.id ?? -1) ? { ...msg, read: true } : msg)),
            )

            // 선택 초기화
            setSelectedMessages([])
            setSelectAll(false)
        } catch (error) {
            console.error('읽음 상태 업데이트 실패:', error)
        }
    }

    // 모달 닫기 핸들러
    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedMessage(null)
        // URL에서 messageId 파라미터 제거
        const url = new URL(window.location.href)
        url.searchParams.delete('messageId')
        window.history.replaceState({}, '', url.toString())
    }

    // 답장 모달 닫기 핸들러
    const handleCloseReplyModal = () => {
        setIsReplyModalOpen(false)
        setReplyContent('')
    }

    // 날짜 포맷 함수
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')

        return `${year}.${month}.${day} ${hours}:${minutes}`
    }

    // 답장 보내기 핸들러
    const handleSendReply = async () => {
        if (!selectedMessage?.senderId || !replyContent.trim()) return

        setIsSending(true)
        try {
            await client.POST('/messages', {
                body: {
                    receiverId: selectedMessage.senderId,
                    content: replyContent,
                },
            })

            // 답장 모달 닫기
            setIsReplyModalOpen(false)
            setReplyContent('')

            // 메시지 목록 새로고침
            setMessages([])
            setCursor(null)
            fetchMessages()
        } catch (error) {
            console.error('답장 전송 실패:', error)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <main className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex">
                    {/* 왼쪽 사이드 메뉴 */}
                    <div className="w-[230px] mr-8">
                        <div className="bg-gray-800 text-white">
                            <button
                                className={`w-full text-left py-3 px-4 flex items-center ${
                                    activeTab === 'received' ? 'bg-gray-700' : ''
                                }`}
                                onClick={() => setActiveTab('received')}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 mr-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                    />
                                </svg>
                                받은 쪽지함
                            </button>
                        </div>
                        <button
                            className={`w-full text-left py-3 px-4 flex items-center border border-t-0 border-gray-700 hover:bg-gray-700 text-white ${
                                activeTab === 'sent' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => setActiveTab('sent')}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                            </svg>
                            보낸 쪽지함
                        </button>
                    </div>

                    {/* 오른쪽 컨텐츠 */}
                    <div className="flex-1">
                        <div className="mb-6">
                            <h2 className="text-xl font-medium text-white">쪽지함</h2>
                        </div>

                        {/* 쪽지 목록 */}
                        <div>
                            <div className="flex justify-end mb-4 gap-2">
                                {activeTab === 'received' && (
                                    <button
                                        onClick={handleMarkAsRead}
                                        className={`px-4 py-2 rounded-md flex items-center justify-center gap-2 border border-gray-700 bg-gray-800 text-gray-300 ${
                                            selectedMessages.length > 0
                                                ? 'hover:bg-gray-700'
                                                : 'opacity-70 cursor-not-allowed'
                                        }`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        읽음 표시
                                    </button>
                                )}
                                <button
                                    className={`px-4 py-2 rounded-md flex items-center justify-center gap-2 border border-gray-700 bg-gray-800 text-gray-300 ${
                                        selectedMessages.length > 0
                                            ? 'hover:bg-gray-700'
                                            : 'opacity-70 cursor-not-allowed'
                                    }`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                    삭제
                                </button>
                            </div>

                            <div className="bg-gray-800 border border-gray-700 rounded-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-700" style={{ backgroundColor: '#1F2937' }}>
                                            <th className="p-4 text-center w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    className="rounded"
                                                />
                                            </th>
                                            <th className="p-4 text-center font-medium text-sm text-gray-300 w-24">
                                                {activeTab === 'received' ? '보낸사람' : '받는사람'}
                                            </th>
                                            <th className="p-4 text-center font-medium text-sm text-gray-300">내용</th>
                                            <th className="p-4 text-center font-medium text-sm text-gray-300 w-24">
                                                날짜
                                            </th>
                                            <th className="p-1 text-center font-medium text-sm text-gray-300 w-20">
                                                {activeTab === 'received' ? '상태' : '읽음 여부'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading && messages.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-gray-300">
                                                    메시지를 불러오는 중...
                                                </td>
                                            </tr>
                                        ) : error ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-red-300">
                                                    {error}
                                                </td>
                                            </tr>
                                        ) : messages.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-gray-400">
                                                    {activeTab === 'received'
                                                        ? '받은 쪽지가 없습니다.'
                                                        : '보낸 쪽지가 없습니다.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            messages.map((message) => (
                                                <tr
                                                    key={message.id}
                                                    className="border-b border-gray-700 hover:bg-gray-700"
                                                >
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMessages.includes(message.id)}
                                                            onChange={() => handleSelectMessage(message.id)}
                                                            className="rounded"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-gray-300">
                                                        {activeTab === 'received'
                                                            ? message.senderNickname
                                                            : message.receiverNickname}
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            className="text-left hover:text-[#FFB130] focus:outline-none text-gray-300"
                                                            onClick={() => handleOpenMessage(message)}
                                                        >
                                                            {message.content}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-gray-400">
                                                        {formatDate(message.createdAt)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs ${
                                                                message.read
                                                                    ? 'bg-gray-700 text-gray-300'
                                                                    : 'bg-red-900/70 text-red-300'
                                                            }`}
                                                        >
                                                            {message.read ? '읽음' : '안읽음'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                {/* 페이지네이션 */}
                                {hasNext && (
                                    <div className="flex justify-center p-4">
                                        <button
                                            onClick={() => fetchMessages(cursor)}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? '불러오는 중...' : '더 보기'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="text-sm text-gray-400 mt-2">전체 {messages.length} 개</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 쪽지 상세 모달 */}
            {isModalOpen && selectedMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div
                        className="fixed inset-0"
                        style={{ backgroundColor: '#3D3D3D', opacity: '0.6' }}
                        onClick={handleCloseModal}
                    ></div>
                    <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-white">쪽지 보기</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-300">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="font-medium mb-1 text-gray-300">
                                {activeTab === 'received' ? '보낸 사람' : '받는 사람'}
                            </div>
                            <div className="flex items-center bg-gray-700 p-3 rounded-md">
                                <div className="w-8 h-8 bg-[#FFB130] text-black rounded-full flex items-center justify-center font-medium text-sm mr-3">
                                    {(activeTab === 'received'
                                        ? selectedMessage.senderNickname
                                        : selectedMessage.receiverNickname
                                    )?.charAt(0) ?? '?'}
                                </div>
                                <div className="font-medium text-white">
                                    {activeTab === 'received'
                                        ? selectedMessage.senderNickname
                                        : selectedMessage.receiverNickname}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="font-medium mb-1 text-gray-300">내용</div>
                            <div className="bg-gray-700 p-3 rounded-md min-h-[100px] text-gray-300 whitespace-pre-wrap">
                                {selectedMessage.content}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-700"
                            >
                                닫기
                            </button>
                            {activeTab === 'received' && (
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false)
                                        setIsReplyModalOpen(true)
                                    }}
                                    className="px-4 py-2 bg-[#FFB130] text-black rounded-md hover:bg-[#F0A120]"
                                >
                                    답장하기
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 답장하기 모달 */}
            {isReplyModalOpen && selectedMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div
                        className="fixed inset-0"
                        style={{ backgroundColor: '#3D3D3D', opacity: '0.6' }}
                        onClick={handleCloseReplyModal}
                    ></div>
                    <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-white">답장 하기</h3>
                            <button onClick={handleCloseReplyModal} className="text-gray-400 hover:text-gray-300">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="font-medium mb-1 text-gray-300">받는 사람</div>
                            <div className="flex items-center bg-gray-700 p-3 rounded-md">
                                <div className="w-8 h-8 bg-[#FFB130] text-black rounded-full flex items-center justify-center font-medium text-sm mr-3">
                                    {selectedMessage.senderNickname.charAt(0)}
                                </div>
                                <div className="font-medium text-white">{selectedMessage.senderNickname}</div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="font-medium mb-1 text-gray-300">내용</div>
                            <textarea
                                className="w-full border border-gray-700 rounded-md p-3 h-36 focus:outline-none focus:ring-1 focus:ring-[#FFB130] bg-gray-700 text-gray-300"
                                placeholder="내용을 입력하세요"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleCloseReplyModal}
                                className="px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-700"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleSendReply}
                                disabled={isSending || !replyContent.trim()}
                                className={`px-4 py-2 bg-[#FFB130] text-black rounded-md hover:bg-[#F0A120] ${
                                    isSending || !replyContent.trim() ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isSending ? '전송 중...' : '보내기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
