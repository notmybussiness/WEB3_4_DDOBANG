import client from '@/lib/backend/client'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface NewThemesModalProps {
    isOpen: boolean
    onClose: () => void
    onThemeCreated: (theme: { id: string; name: string; storeName: string }) => void
}

interface Tag {
    id: number
    name: string
}

const TAGS: Tag[] = [
    { id: 1, name: '공포' },
    { id: 2, name: '감성' },
    { id: 3, name: '판타지' },
]

export function NewThemesModal({ isOpen, onClose, onThemeCreated }: NewThemesModalProps) {
    const [newThemeName, setNewThemeName] = useState('')
    const [newThemeStoreName, setNewThemeStoreName] = useState('')
    const [newThemeThumbnailUrl, setNewThemeThumbnailUrl] = useState('')
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
    const [isCreatingTheme, setIsCreatingTheme] = useState(false)

    const createNewTheme = async () => {
        if (!newThemeName.trim()) {
            alert('테마 이름을 입력해주세요.')
            return
        }

        if (!newThemeStoreName.trim()) {
            alert('매장 이름을 입력해주세요.')
            return
        }

        if (selectedTagIds.length === 0) {
            alert('태그를 선택해주세요.')
            return
        }

        try {
            setIsCreatingTheme(true)
            const { data, error } = await client.POST('/api/v1/diaries/theme', {
                body: {
                    themeName: newThemeName,
                    storeName: newThemeStoreName,
                    thumbnailUrl: newThemeThumbnailUrl,
                    tagIds: selectedTagIds,
                },
            })

            if (error) {
                throw error
            }

            if (data?.data) {
                const newTheme = data.data
                if (!newTheme.themeId || !newTheme.themeName || !newTheme.storeName) {
                    throw new Error('테마 데이터가 올바르지 않습니다.')
                }
                console.log('테마 등록 성공:', newTheme)
                onThemeCreated({
                    id: newTheme.themeId.toString(),
                    name: newTheme.themeName,
                    storeName: newTheme.storeName,
                })
                onClose()

                // 입력 필드 초기화
                setNewThemeName('')
                setNewThemeStoreName('')
                setNewThemeThumbnailUrl('')
                setSelectedTagIds([])

                alert('테마가 성공적으로 등록되었습니다.')
            }
        } catch (error) {
            console.error('Error creating theme:', error)
            alert('테마 등록에 실패했습니다.')
        } finally {
            setIsCreatingTheme(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">새 테마 등록</h2>
                    <button
                        onClick={() => {
                            console.log('모달 닫힘')
                            onClose()
                        }}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">테마 이름</label>
                        <input
                            type="text"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">매장 이름</label>
                        <input
                            type="text"
                            value={newThemeStoreName}
                            onChange={(e) => setNewThemeStoreName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">썸네일 URL</label>
                        <input
                            type="text"
                            value={newThemeThumbnailUrl}
                            onChange={(e) => setNewThemeThumbnailUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
                        <div className="space-y-2">
                            <select
                                value=""
                                onChange={(e) => {
                                    const tagId = Number(e.target.value)
                                    if (tagId && !selectedTagIds.includes(tagId)) {
                                        setSelectedTagIds((prev) => [...prev, tagId])
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">태그를 선택해주세요</option>
                                {TAGS.filter((tag) => !selectedTagIds.includes(tag.id)).map((tag) => (
                                    <option key={tag.id} value={tag.id}>
                                        {tag.name}
                                    </option>
                                ))}
                            </select>
                            {selectedTagIds.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 mb-1">선택된 태그:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTagIds.map((tagId) => {
                                            const tag = TAGS.find((t) => t.id === tagId)
                                            return (
                                                <div
                                                    key={tagId}
                                                    className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center"
                                                >
                                                    <span>{tag?.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedTagIds((prev) =>
                                                                prev.filter((id) => id !== tagId),
                                                            )
                                                        }
                                                        className="ml-1 text-gray-500 hover:text-gray-700"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                        취소
                    </button>
                    <button
                        onClick={createNewTheme}
                        disabled={isCreatingTheme}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isCreatingTheme ? '등록 중...' : '등록'}
                    </button>
                </div>
            </div>
        </div>
    )
}
