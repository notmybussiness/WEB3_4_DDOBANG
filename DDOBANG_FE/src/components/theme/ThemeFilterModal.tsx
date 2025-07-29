import type { components } from '@/lib/backend/apiV1/schema'
import client from '@/lib/backend/client'
import { useEffect, useState } from 'react'

type ThemeTagResponse = components['schemas']['ThemeTagResponse']
type SubRegionsResponse = components['schemas']['SubRegionsResponse']

interface Participant {
    id: string
    name: string
}

interface FilterValues {
    regions: string[] // 지역 ID 배열
    genres: number[] // 장르 ID 배열
    participant: string // 참여 인원
    subRegions: string[] // 지역 이름 배열 (표시용)
    genreNames: string[] // 장르 이름 배열 (표시용)
}

interface ThemeFilterModalProps {
    isOpen: boolean
    onClose: () => void
    onApply: (filters: FilterValues) => void
    currentFilters?: FilterValues
}

export function ThemeFilterModal({ isOpen, onClose, onApply, currentFilters }: ThemeFilterModalProps) {
    const [selectedRegions, setSelectedRegions] = useState<string[]>(currentFilters?.regions || [])
    const [selectedGenres, setSelectedGenres] = useState<number[]>(currentFilters?.genres || [])
    const [selectedParticipant, setSelectedParticipant] = useState<string>(currentFilters?.participant || '')
    const [activeRegion, setActiveRegion] = useState('서울')
    const [tags, setTags] = useState<ThemeTagResponse[]>([])
    const [regions, setRegions] = useState<SubRegionsResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingRegions, setLoadingRegions] = useState(false)

    const participants: Participant[] = [
        { id: '1', name: '1명' },
        { id: '2', name: '2명' },
        { id: '3', name: '3명' },
        { id: '4', name: '4명' },
        { id: '5', name: '5명' },
        { id: '6', name: '6명' },
        { id: '7', name: '7명' },
        { id: '8', name: '8명 이상' },
    ]

    const majorRegions = [
        { id: '서울', name: '서울' },
        { id: '경기/인천', name: '경기/인천' },
        { id: '충청', name: '충청' },
        { id: '경상', name: '경상' },
        { id: '전라', name: '전라' },
        { id: '강원', name: '강원' },
        { id: '제주', name: '제주' },
    ]

    useEffect(() => {
        if (isOpen) {
            fetchTags()
            fetchRegions()
            // 모달이 열릴 때 currentFilters 값으로 상태 초기화
            setSelectedRegions(currentFilters?.regions || [])
            setSelectedGenres(currentFilters?.genres || [])
            setSelectedParticipant(currentFilters?.participant || '')
        }
    }, [isOpen, currentFilters])

    const fetchRegions = async () => {
        setLoadingRegions(true)
        try {
            const response = await client.GET('/api/v1/regions', {
                params: {
                    query: {
                        majorRegion: activeRegion,
                    },
                },
            })

            if (response?.data?.data) {
                // 유효한 데이터만 필터링
                const validRegions = response.data.data.filter(
                    (region): region is SubRegionsResponse =>
                        typeof region.id === 'number' && typeof region.subRegion === 'string',
                )
                setRegions(validRegions)
            }
        } catch (error) {
            console.error('지역 목록을 불러오는 중 오류가 발생했습니다:', error)
        } finally {
            setLoadingRegions(false)
        }
    }

    const fetchTags = async () => {
        setLoading(true)
        try {
            const response = await client.GET('/api/v1/themes/tags')
            if (response?.data?.data) {
                // 유효한 데이터만 필터링
                const validTags = response.data.data.filter(
                    (tag): tag is ThemeTagResponse => typeof tag.id === 'number' && typeof tag.name === 'string',
                )
                setTags(validTags)
            }
        } catch (error) {
            console.error('태그 목록을 불러오는 중 오류가 발생했습니다:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRegionToggle = (regionId: number) => {
        setSelectedRegions((prev) => {
            const regionIdStr = String(regionId)
            if (prev.includes(regionIdStr)) {
                return prev.filter((r) => r !== regionIdStr)
            } else {
                return [...prev, regionIdStr]
            }
        })
    }

    const handleGenreToggle = (tagId: number) => {
        setSelectedGenres((prev) => (prev.includes(tagId) ? prev.filter((g) => g !== tagId) : [...prev, tagId]))
    }

    const handleParticipantToggle = (participant: string) => {
        setSelectedParticipant(selectedParticipant === participant ? '' : participant)
    }

    const handleRegionClick = async (majorRegion: string) => {
        setActiveRegion(majorRegion)
        await fetchRegions()
    }

    const handleReset = () => {
        setSelectedRegions([])
        setSelectedGenres([])
        setSelectedParticipant('')
        setActiveRegion('서울')
    }

    const handleApply = () => {
        const selectedSubRegions = selectedRegions
            .map((regionId) => {
                const region = regions.find((r) => r.id === Number(regionId || 0)) as SubRegionsResponse | undefined
                return region?.subRegion || ''
            })
            .filter(Boolean) as string[]

        const selectedGenreNames = selectedGenres
            .map((genreId) => {
                const tag = tags.find((t) => t.id === (genreId || 0)) as ThemeTagResponse | undefined
                return tag?.name || ''
            })
            .filter(Boolean) as string[]

        const filters: FilterValues = {
            regions: selectedRegions,
            genres: selectedGenres,
            participant: selectedParticipant,
            subRegions: selectedSubRegions,
            genreNames: selectedGenreNames,
        }
        onApply(filters)
        onClose()
    }

    const getSelectedFiltersText = () => {
        const regionText =
            selectedRegions.length > 0
                ? `지역: ${selectedRegions
                      .map((regionId) => {
                          const region = regions.find((r) => r.id === Number(regionId || 0)) as
                              | SubRegionsResponse
                              | undefined
                          return region?.subRegion || ''
                      })
                      .filter(Boolean)
                      .join(', ')}`
                : ''

        const genreText =
            selectedGenres.length > 0
                ? `장르: ${selectedGenres
                      .map((tagId) => {
                          const tag = tags.find((t) => t.id === (tagId || 0)) as ThemeTagResponse | undefined
                          return tag?.name || ''
                      })
                      .filter(Boolean)
                      .join(', ')}`
                : ''

        const participantText = selectedParticipant ? `인원: ${selectedParticipant}명` : ''

        const texts = [regionText, genreText, participantText].filter(Boolean)
        return texts.join(' | ')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 flex items-start justify-center z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[3px]" onClick={onClose}></div>
            <div className="bg-gray-800 rounded-2xl w-full max-w-[1105px] p-4 md:p-8 mx-4 my-4 shadow-lg relative">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">검색 필터 - 테마</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center mb-8 gap-2 md:gap-0">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            placeholder="직접 전 선택한 필터 표시"
                            value={getSelectedFiltersText()}
                            className="w-full px-4 py-2.5 pl-9 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-gray-600 placeholder:text-gray-500 text-gray-300"
                            disabled
                        />
                        <div className="absolute left-3.5 top-[32%]">
                            <img src="/placeholder_search.svg" alt="검색" width={16} height={16} />
                        </div>
                    </div>
                    <button
                        onClick={handleReset}
                        className="w-full md:w-auto md:ml-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                    >
                        선택 초기화
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700 h-[480px] overflow-auto">
                            <h3 className="text-lg font-medium mb-4 text-center text-white">지역별</h3>
                            <div className="flex h-[calc(100%-40px)]">
                                <div className="w-[120px] md:w-[140px] bg-gray-700 rounded-xl p-2 md:p-4 border border-gray-700">
                                    {majorRegions.map((region) => (
                                        <button
                                            key={region.id}
                                            onClick={() => handleRegionClick(region.id)}
                                            className={`w-full text-left mb-3 text-sm whitespace-nowrap px-2 md:px-3 py-2 rounded-lg transition-colors ${
                                                activeRegion === region.id
                                                    ? 'bg-[#FFB230] text-white'
                                                    : 'text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {region.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex-1 pl-2 md:pl-4">
                                    <div className="grid grid-cols-1 gap-2">
                                        {loadingRegions ? (
                                            <div className="flex justify-center items-center h-full">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300"></div>
                                            </div>
                                        ) : (
                                            regions.map((region) => (
                                                <div key={region.id} className="flex items-center group">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id={region.subRegion}
                                                            checked={selectedRegions.includes(String(region.id))}
                                                            onChange={() => handleRegionToggle(region.id)}
                                                            className="peer w-4 h-4 rounded border border-gray-600 text-[#FFB230] focus:ring-[#FFB230] focus:ring-2 focus:ring-offset-2 cursor-pointer appearance-none checked:bg-[#FFB230] checked:border-[#FFB230] transition-colors"
                                                        />
                                                        <svg
                                                            className="absolute w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-white"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <path
                                                                d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"
                                                                fill="currentColor"
                                                            />
                                                        </svg>
                                                        <label
                                                            htmlFor={region.subRegion}
                                                            className={`ml-2 text-sm cursor-pointer select-none ${
                                                                selectedRegions.includes(String(region.id))
                                                                    ? 'text-[#FFB230] font-medium'
                                                                    : 'text-gray-300 group-hover:text-gray-200'
                                                            }`}
                                                        >
                                                            {region.subRegion}
                                                        </label>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700 h-[480px] overflow-auto">
                            <h3 className="text-lg font-medium mb-4 text-center text-white">장르별</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {loading ? (
                                    <div className="col-span-3 flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300"></div>
                                    </div>
                                ) : (
                                    tags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleGenreToggle(tag.id)}
                                            className={`text-sm rounded-lg border px-3 py-2 transition-colors ${
                                                selectedGenres.includes(tag.id)
                                                    ? 'bg-[#FFB230] text-white border-[#FFB230]'
                                                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-700 h-[480px] overflow-auto">
                            <h3 className="text-lg font-medium mb-4 text-center text-white">인원별</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                                {participants.map((participant) => (
                                    <button
                                        key={participant.id}
                                        onClick={() => handleParticipantToggle(participant.id)}
                                        className={`text-sm rounded-lg border px-2 md:px-3 py-2 transition-colors ${
                                            selectedParticipant === participant.id
                                                ? 'bg-[#FFB230] text-white border-[#FFB230]'
                                                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                        }`}
                                    >
                                        {participant.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-8 gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 md:px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-4 md:px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900"
                    >
                        적용하기
                    </button>
                </div>
            </div>
        </div>
    )
}
