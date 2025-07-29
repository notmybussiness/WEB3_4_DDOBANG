import client from '@/lib/backend/client'
import { useState } from 'react'

interface MessageModalProps {
    receiverId: number
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export default function MessageModal({ receiverId, isOpen, onClose, onSuccess }: MessageModalProps) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) {
            setError('메시지 내용을 입력해주세요.')
            return
        }

        try {
            setLoading(true)
            setError(null)

            await client.POST('/messages', {
                body: {
                    receiverId,
                    content: content.trim(),
                },
            })

            setContent('')
            onSuccess?.()
            onClose()
        } catch (err) {
            console.error('메시지 전송 중 오류:', err)
            setError('메시지 전송에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">쪽지 보내기</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="메시지를 입력해주세요..."
                            className="w-full h-32 p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB130] resize-none"
                            disabled={loading}
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                            disabled={loading}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[#FFB130] hover:bg-[#F0A420] text-white rounded-lg flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    전송 중...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                        />
                                    </svg>
                                    전송
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
