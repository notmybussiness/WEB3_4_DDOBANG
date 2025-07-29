'use client'

import { NewThemesModal } from '@/components/theme/NewThemesModal'
import { ThemeSearchModal } from '@/components/theme/ThemeSearchModalForDiary'
import { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

// 테마 타입 정의
type Theme = {
    id: string
    name: string
    storeName: string
}

// 평가 항목 타입 정의
type RatingCategory =
    | 'interior'
    | 'composition'
    | 'story'
    | 'production'
    | 'satisfaction'
    | 'difficulty'
    | 'horror'
    | 'activity'

// DiaryRequestDto 인터페이스 정의 제거 (스키마에서 가져옴)
type DiaryRequestDto = components['schemas']['DiaryRequestDto']

// 메인 컴포넌트
export default function NewDiaryPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ==================== 상태 관리 ====================

    // 테마 관련 상태
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
    const [isNewThemeModalOpen, setIsNewThemeModalOpen] = useState(false)
    const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [themes, setThemes] = useState<Theme[]>([])
    const [isLoadingThemes, setIsLoadingThemes] = useState(false)

    // 새 테마 등록 관련 상태
    const [newThemeName, setNewThemeName] = useState('')
    const [newThemeStoreName, setNewThemeStoreName] = useState('')
    const [newThemeThumbnailUrl, setNewThemeThumbnailUrl] = useState('')
    const [newThemeTagIds, setNewThemeTagIds] = useState<number[]>([])
    const [isCreatingTheme, setIsCreatingTheme] = useState(false)

    // 기본 정보 관련 상태
    const [date, setDate] = useState('')
    const [participants, setParticipants] = useState('')

    // 이미지 관련 상태
    const [escapeImages, setEscapeImages] = useState<string[]>([])
    const [newEscapeImage, setNewEscapeImage] = useState('')
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)

    // 평가 관련 상태
    const [ratings, setRatings] = useState({
        interior: 0,
        composition: 0,
        story: 0,
        production: 0,
        satisfaction: 0,
        difficulty: 0,
        horror: 0,
        activity: 0,
    })

    // 장치 관련 상태
    const [deviceRatio, setDeviceRatio] = useState(0)
    const [noDevice, setNoDevice] = useState(false)

    // 탈출 정보 관련 상태
    const [hintCount, setHintCount] = useState<number | null>(null)
    const [isSuccess, setIsSuccess] = useState<boolean>(true)
    const [timeType, setTimeType] = useState<'진행 시간' | '잔여 시간'>('진행 시간')
    const [time, setTime] = useState('00:00')

    // 소감 관련 상태
    const [comment, setComment] = useState('')

    // ==================== API 호출 함수 ====================

    // 테마 검색 API 호출
    const searchThemes = async (keyword: string) => {
        if (!keyword.trim()) return

        try {
            setIsLoadingThemes(true)
            const response = await client.GET('/api/v1/themes/search-for-diary', {
                params: {
                    query: {
                        keyword,
                    },
                },
            })

            if (response.data?.data) {
                setThemes(
                    response.data.data.map((theme: components['schemas']['SimpleThemeResponse']) => ({
                        id: theme.themeId?.toString() || '',
                        name: theme.themeName || '',
                        storeName: theme.storeName || '',
                    })),
                )
            }
        } catch (error) {
            console.error('Error searching themes:', error)
            alert('테마 검색에 실패했습니다.')
        } finally {
            setIsLoadingThemes(false)
        }
    }

    // 새 테마 등록 API 호출
    const createNewTheme = async () => {
        if (!newThemeName.trim()) {
            alert('테마 이름을 입력해주세요.')
            return
        }

        if (!newThemeStoreName.trim()) {
            alert('매장 이름을 입력해주세요.')
            return
        }

        try {
            setIsCreatingTheme(true)
            const response = await client.POST('/api/v1/diaries/theme', {
                body: {
                    themeName: newThemeName,
                    storeName: newThemeStoreName,
                    thumbnailUrl: newThemeThumbnailUrl,
                    tagIds: newThemeTagIds,
                },
            })

            const newTheme = response.data?.data
            if (newTheme) {
                setSelectedTheme({
                    id: newTheme.themeId?.toString() || '',
                    name: newTheme.themeName || '',
                    storeName: newTheme.storeName || '',
                })
                setIsNewThemeModalOpen(false)

                // 입력 필드 초기화
                setNewThemeName('')
                setNewThemeStoreName('')
                setNewThemeThumbnailUrl('')
                setNewThemeTagIds([])

                alert('테마가 성공적으로 등록되었습니다.')
            }
        } catch (error) {
            console.error('Error creating theme:', error)
            alert('테마 등록에 실패했습니다.')
        } finally {
            setIsCreatingTheme(false)
        }
    }

    // 이미지 관련 핸들러
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]

            // 파일 확장자 검사
            const validExtensions = ['jpg', 'jpeg', 'png']
            const fileExtension = file.name.split('.').pop()?.toLowerCase()

            if (!fileExtension || !validExtensions.includes(fileExtension)) {
                alert('이미지 파일만 업로드 가능합니다.')
                return
            }

            // 파일 크기 검사 (10MB = 10 * 1024 * 1024 bytes)
            const maxSize = 10 * 1024 * 1024
            if (file.size > maxSize) {
                alert('파일 크기는 10MB를 초과할 수 없습니다.')
                return
            }

            setUploadedFile(file)
        }
    }

    const removeUploadedFile = () => {
        setUploadedFile(null)
    }

    // 탈출일지 등록 API 호출
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // 필수 입력값 검증
        if (!selectedTheme) {
            alert('테마를 선택해주세요.')
            return
        }

        // 시간이 없을 경우 "00:00"으로 설정
        const submitTime = time || '00:00'

        // 시간 형식 검증
        if (!/^\d{1,3}:\d{1,2}$/.test(submitTime)) {
            alert("시간을 '분:초' 형식으로 입력해주세요 (예: 30:00)")
            return
        }

        try {
            // 1. 먼저 일지 등록
            const diaryRequest: components['schemas']['DiaryRequestDto'] = {
                themeId: parseInt(selectedTheme.id),
                escapeDate: date,
                participants: participants,
                difficulty: ratings.difficulty || 0,
                fear: ratings.horror || 0,
                activity: ratings.activity || 0,
                satisfaction: ratings.satisfaction || 0,
                production: ratings.production || 0,
                story: ratings.story || 0,
                question: ratings.composition || 0,
                interior: ratings.interior || 0,
                deviceRatio: noDevice ? 0 : deviceRatio,
                hintCount: hintCount || 0,
                escapeResult: isSuccess,
                timeType: timeType === '진행 시간' ? 'ELAPSED' : 'REMAINING',
                elapsedTime: submitTime,
                review: comment,
            }

            const diaryResponse = await client.POST('/api/v1/diaries', {
                body: diaryRequest,
            })

            const responseData = diaryResponse.data
            if (!responseData?.data?.id) {
                throw new Error(responseData?.message || '일지 등록에 실패했습니다.')
            }

            const diaryId = responseData.data.id

            // 2. 이미지가 있는 경우 업로드
            if (uploadedFile) {
                const formData = new FormData()
                formData.append('file', uploadedFile)

                await fetch(`/api/v1/upload/image/${diaryId}?target=DIARY`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                })
            }

            alert('탈출일지가 성공적으로 등록되었습니다.')
            router.push('/my/diary')
        } catch (error: any) {
            console.error('Form submission error:', error)
            if (error.response?.data?.message) {
                alert(error.response.data.message)
            } else {
                alert('탈출일지 등록에 실패했습니다. 다시 시도해주세요.')
            }
        }
    }

    // ==================== 이벤트 핸들러 ====================

    // 테마 모달 관련 핸들러
    const openThemeModal = () => {
        setIsThemeModalOpen(true)
        setSearchKeyword('')
        setThemes([])
    }

    const openNewThemeModal = () => {
        setIsNewThemeModalOpen(true)
        setIsThemeModalOpen(false)
    }

    const handleThemeSelect = (themeName: string, themeId: number) => {
        setSelectedTheme({
            id: themeId.toString(),
            name: themeName,
            storeName: '', // ThemeSearchModal에서 storeName을 가져오지 않으므로 빈 문자열로 설정
        })
        setIsThemeModalOpen(false)
    }

    // 평가 항목 변경 핸들러
    const handleRatingChange = (category: RatingCategory, value: number) => {
        setRatings((prev) => ({
            ...prev,
            [category]: value,
        }))
    }

    const removeEscapeImage = (index: number) => {
        setEscapeImages((prev) => prev.filter((_, i) => i !== index))
    }

    // 새 테마 등록 핸들러
    const handleThemeCreated = (theme: { id: string; name: string; storeName: string }) => {
        setSelectedTheme(theme)
        setIsNewThemeModalOpen(false)
    }

    // ==================== 렌더링 ====================
    return (
        <main className="min-h-screen bg-gray-900">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-8 text-center text-white">탈출일지 작성</h1>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 섹션 1: 테마 선택 */}
                    <section className="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 text-white">테마 선택</h2>

                        {selectedTheme ? (
                            <div className="flex justify-between items-center p-4 border border-gray-700 rounded-lg bg-gray-700">
                                <div>
                                    <p className="font-medium text-white">{selectedTheme.name}</p>
                                    <p className="text-gray-300 text-sm">{selectedTheme.storeName}</p>
                                </div>
                                <button
                                    type="button"
                                    className="text-sm text-blue-400"
                                    onClick={() => setSelectedTheme(null)}
                                >
                                    변경
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="테마 또는 매장명으로 검색"
                                    className="flex-1 px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                                    readOnly
                                    onClick={() => setIsThemeModalOpen(true)}
                                />
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-[#FFB130] text-black rounded-lg"
                                    onClick={() => setIsThemeModalOpen(true)}
                                >
                                    테마 검색
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg"
                                    onClick={openNewThemeModal}
                                >
                                    새 테마 등록
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">* 테마 선택은 필수입니다.</p>
                    </section>

                    {/* 섹션 2: 탈출 사진 및 기본 정보 */}
                    <section className="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 text-white">기본 정보</h2>

                        <div className="space-y-4">
                            {/* 탈출 사진 */}
                            <div>
                                <h3 className="text-md font-medium mb-2 text-white">탈출 사진</h3>
                                <div
                                    className="border-dashed border-2 border-gray-600 p-6 rounded-lg text-center mb-4 cursor-pointer bg-gray-700"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <div className="flex items-center justify-center mb-4">
                                        <svg
                                            className="w-8 h-8 text-gray-400"
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
                                    <p className="text-sm text-gray-400 mb-2">
                                        탈출 사진을 드래그하거나 클릭하여 업로드하세요
                                    </p>
                                </div>

                                {/* 선택된 파일 목록 표시 */}
                                {uploadedFile && (
                                    <div className="relative mt-2 mb-4">
                                        <div className="bg-gray-700 h-24 rounded-lg flex items-center justify-center overflow-hidden">
                                            <img
                                                src={URL.createObjectURL(uploadedFile)}
                                                alt="Preview"
                                                className="h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeUploadedFile}
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}

                                {escapeImages.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {escapeImages.map((url, index) => (
                                            <div key={`url-${index}`} className="relative">
                                                <div className="bg-gray-700 h-24 rounded-lg flex items-center justify-center overflow-hidden">
                                                    <span className="text-xs text-gray-300 break-all px-2">{url}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeEscapeImage(index)}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 진행 날짜 */}
                            <div>
                                <h3 className="text-md font-medium mb-2 text-white">진행 날짜</h3>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                                />
                            </div>

                            {/* 함께한 사람 */}
                            <div>
                                <h3 className="text-md font-medium mb-2 text-white">함께한 사람</h3>
                                <input
                                    type="text"
                                    value={participants}
                                    onChange={(e) => setParticipants(e.target.value)}
                                    placeholder="예) 홍길동, 김철수, 이영희"
                                    className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 섹션 3: 테마 평가 */}
                    <section className="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 text-white">테마 평가</h2>

                        <div className="grid grid-cols-2 gap-6">
                            {/* 평가 항목들 */}
                            {[
                                { id: 'interior', label: '인테리어', color: '#FCD34D' },
                                { id: 'composition', label: '문제 구성', color: '#FCD34D' },
                                { id: 'story', label: '스토리', color: '#FCD34D' },
                                { id: 'production', label: '연출', color: '#FCD34D' },
                                { id: 'satisfaction', label: '만족도', color: '#FCD34D' },
                                { id: 'difficulty', label: '난이도', color: '#3B82F6' },
                                { id: 'horror', label: '공포도', color: '#EF4444' },
                                { id: 'activity', label: '활동성', color: '#10B981' },
                            ].map((item) => (
                                <div key={item.id}>
                                    <h3 className="text-md font-medium mb-2 text-white">{item.label}</h3>
                                    <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => handleRatingChange(item.id as RatingCategory, star)}
                                                style={{
                                                    width: '1.5rem',
                                                    height: '1.5rem',
                                                    color:
                                                        star <= ratings[item.id as RatingCategory]
                                                            ? item.color
                                                            : '#6B7280',
                                                }}
                                            >
                                                <svg fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* 장치 비중 */}
                            <div className="col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-md font-medium text-white">장치 비중</h3>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={noDevice}
                                            onChange={(e) => setNoDevice(e.target.checked)}
                                            className="mr-2"
                                        />
                                        <span className="text-sm text-white">장치X</span>
                                    </label>
                                </div>
                                <div className="mb-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={deviceRatio}
                                        onChange={(e) => setDeviceRatio(parseInt(e.target.value))}
                                        disabled={noDevice}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-white">
                                    <span>자물쇠</span>
                                    <span>{deviceRatio}%</span>
                                    <span>전자장치</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 섹션 4: 탈출 정보 */}
                    <section className="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 text-white">탈출 정보</h2>

                        <div className="flex items-start gap-4">
                            {/* 탈출 여부 */}
                            <div className="w-1/3">
                                <h3 className="text-md font-medium mb-2 text-white">탈출 여부</h3>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="escapeSuccess"
                                            checked={isSuccess === true}
                                            onChange={() => setIsSuccess(true)}
                                            className="mr-2"
                                        />
                                        <span className="text-white">탈출 성공</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="escapeSuccess"
                                            checked={isSuccess === false}
                                            onChange={() => setIsSuccess(false)}
                                            className="mr-2"
                                        />
                                        <span className="text-white">탈출 실패</span>
                                    </label>
                                </div>
                            </div>

                            {/* 시간 */}
                            <div className="w-3/5">
                                <h3 className="text-md font-medium mb-2 text-white">시간</h3>
                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="timeType"
                                                checked={timeType === '진행 시간'}
                                                onChange={() => setTimeType('진행 시간')}
                                                className="mr-2"
                                            />
                                            <span className="text-white">진행 시간</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="timeType"
                                                checked={timeType === '잔여 시간'}
                                                onChange={() => setTimeType('잔여 시간')}
                                                className="mr-2"
                                            />
                                            <span className="text-white">잔여 시간</span>
                                        </label>
                                    </div>
                                    <div className="flex-1 flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={time.split(':')[0]}
                                            onChange={(e) => {
                                                const min = e.target.value
                                                if (/^\d{0,2}$/.test(min)) {
                                                    setTime(`${min}:${time.split(':')[1] || '00'}`)
                                                }
                                            }}
                                            placeholder="00"
                                            className="w-12 px-2 py-2 text-center border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                                            maxLength={2}
                                        />
                                        <span className="text-white">분</span>
                                        <input
                                            type="text"
                                            value={time.split(':')[1]}
                                            onChange={(e) => {
                                                const sec = e.target.value
                                                if (/^\d{0,2}$/.test(sec)) {
                                                    setTime(`${time.split(':')[0] || '00'}:${sec}`)
                                                }
                                            }}
                                            placeholder="00"
                                            className="w-12 px-2 py-2 text-center border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                                            maxLength={2}
                                        />
                                        <span className="text-white">초</span>
                                    </div>
                                </div>
                            </div>

                            {/* 힌트 사용 횟수 */}
                            <div className="w-1/3">
                                <h3 className="text-md font-medium mb-2 text-white">힌트 사용 횟수</h3>
                                <input
                                    type="number"
                                    min="0"
                                    value={hintCount === null ? '' : hintCount}
                                    onChange={(e) => setHintCount(e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="횟수 입력"
                                    className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 섹션 5: 소감 */}
                    <section className="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 text-white">소감</h2>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="테마에 대한 소감을 자유롭게 작성해주세요."
                            className="w-full h-40 px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                        ></textarea>
                    </section>

                    {/* 등록 버튼 */}
                    <div className="flex justify-center">
                        <button type="submit" className="px-8 py-3 bg-black text-white font-medium rounded-lg">
                            일지 등록
                        </button>
                    </div>
                </form>
            </div>

            <ThemeSearchModal
                isOpen={isThemeModalOpen}
                onClose={() => setIsThemeModalOpen(false)}
                onSelect={handleThemeSelect}
                searchTerm={searchKeyword}
                onSearchTermChange={setSearchKeyword}
                loading={isLoadingThemes}
                onLoadingChange={setIsLoadingThemes}
            />

            <NewThemesModal
                isOpen={isNewThemeModalOpen}
                onClose={() => setIsNewThemeModalOpen(false)}
                onThemeCreated={handleThemeCreated}
            />
        </main>
    )
}
