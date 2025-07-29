'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
    interface Window {
        kakao: any
    }
}

interface KakaoMapProps {
    width?: string
    height?: string
    address: string
    storeName?: string
    name?: string
}

export function KakaoMap({ width = '100%', height = '256px', address, storeName, name }: KakaoMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const loadScript = () => {
            return new Promise<void>((resolve, reject) => {
                if (window.kakao && window.kakao.maps) {
                    console.log('Kakao Maps SDK already loaded')
                    resolve()
                    return
                }

                const script = document.createElement('script')
                script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&libraries=services&autoload=false`
                script.type = 'text/javascript'
                script.async = true
                script.onload = () => {
                    console.log('Kakao Maps SDK loaded successfully')
                    resolve()
                }
                script.onerror = (error) => {
                    console.error('Failed to load Kakao Maps SDK:', error)
                    reject(error)
                }
                document.head.appendChild(script)
            })
        }

        const initializeMap = () => {
            if (!mapRef.current) {
                setError('지도를 표시할 div를 찾을 수 없습니다.')
                return
            }

            try {
                if (!window.kakao || !window.kakao.maps) {
                    throw new Error('Kakao Maps SDK is not properly loaded')
                }

                const defaultCoords = new window.kakao.maps.LatLng(37.5665, 126.978)
                const mapOption = {
                    center: defaultCoords,
                    level: 3,
                }
                const map = new window.kakao.maps.Map(mapRef.current, mapOption)
                const geocoder = new window.kakao.maps.services.Geocoder()

                geocoder.addressSearch(address, function (result: any, status: any) {
                    if (status === window.kakao.maps.services.Status.OK) {
                        try {
                            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x)
                            const marker = new window.kakao.maps.Marker({
                                map: map,
                                position: coords,
                            })
                            const infowindow = new window.kakao.maps.InfoWindow({
                                content: `
                  <div style="width:150px;text-align:center;padding:6px 0;">
                    <div style="font-weight:bold;color:#000;">${name || storeName || ''}</div>
                  </div>
                `,
                            })
                            marker.setTitle(name || storeName || '')
                            infowindow.open(map, marker)
                            window.kakao.maps.event.addListener(marker, 'click', function () {
                                infowindow.open(map, marker)
                            })
                            map.setCenter(coords)
                        } catch (markerError) {
                            console.error('마커 생성 중 오류:', markerError)
                        }
                    } else {
                        console.error('주소 검색 실패:', status)
                    }
                })
            } catch (mapError) {
                console.error('지도 생성 중 오류:', mapError)
                setError('지도 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
            }
        }

        loadScript()
            .then(() => {
                if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
                    window.kakao.maps.load(() => {
                        console.log('Kakao Maps initialized successfully')
                        setIsLoaded(true)
                        setTimeout(() => {
                            initializeMap()
                        }, 100)
                    })
                }
            })
            .catch((error) => {
                console.error('Failed to initialize Kakao Maps:', error)
                setError('카카오맵 초기화에 실패했습니다.')
            })
    }, [address, storeName, name])

    if (error) {
        return (
            <div className="flex items-center justify-center text-red-500" style={{ width, height }}>
                {error}
            </div>
        )
    }

    return (
        <div
            ref={mapRef}
            style={{
                width,
                height,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '0.5rem',
                minHeight: '256px',
                zIndex: 1000,
            }}
        />
    )
}
