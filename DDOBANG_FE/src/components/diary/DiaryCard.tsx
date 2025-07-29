import { components } from '@/lib/backend/apiV1/schema'
import { useRouter } from 'next/navigation'

type DiaryDto = components['schemas']['DiaryDto']

interface DiaryCardProps {
    diary: DiaryDto
}

export function DiaryCard({ diary }: DiaryCardProps) {
    const router = useRouter()

    const handleClick = () => {
        router.push(`/my/diary/${diary.id}`)
    }

    return (
        <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleClick}
        >
            <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                {diary.imageUrl ? (
                    <img src={diary.imageUrl} alt={diary.themeName} className="w-full h-full object-cover" />
                ) : (
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                )}
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{diary.themeName}</h3>
                    <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                            diary.escapeResult ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                    >
                        {diary.escapeResult ? '성공' : '실패'}
                    </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{diary.storeName}</p>
                <div className="space-y-1 text-sm text-gray-500">
                    <p>진행 날짜: {diary.escapeDate}</p>
                    <p>탈출 시간: {diary.elapsedTime}분</p>
                    <p>힌트 사용: {diary.hintCount}회</p>
                </div>
            </div>
        </div>
    )
}
