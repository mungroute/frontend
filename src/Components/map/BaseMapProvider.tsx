import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BaseMapContext } from './BaseMapContext'
import { requestBrowserLocation } from './geolocation'
import type { BaseMapAdapter, BaseMapScene, MapCoordinate, MapMarker } from './types'

type BaseMapProviderProps = {
  adapter?: BaseMapAdapter
  defaultScene: BaseMapScene
  children: ReactNode
}

export function BaseMapProvider({ adapter, defaultScene, children }: BaseMapProviderProps) {
  const [currentLocation, setCurrentLocation] = useState<MapCoordinate>()
  const [currentLocationMarker, setCurrentLocationMarker] = useState<Pick<MapMarker, 'label' | 'profileImageSrc'>>()
  const requestCurrentLocation = useCallback(async () => {
    const coordinate = await requestBrowserLocation()
    setCurrentLocation(coordinate)
    return coordinate
  }, [])
  const locationScene = useMemo<BaseMapScene>(() => currentLocation ? {
    ...defaultScene,
    center: currentLocation,
    zoom: Math.max(defaultScene.zoom, 17),
    markers: [
      ...(defaultScene.markers?.filter((marker) => marker.kind !== 'current-location') ?? []),
      { id: 'current-location', position: currentLocation, kind: 'current-location', ...currentLocationMarker },
    ],
  } : defaultScene, [currentLocation, currentLocationMarker, defaultScene])
  const value = useMemo(() => ({
    adapter,
    defaultScene: locationScene,
    currentLocation,
    requestCurrentLocation,
    currentLocationMarker,
    setCurrentLocationMarker,
  }), [adapter, currentLocation, currentLocationMarker, locationScene, requestCurrentLocation])
  return <BaseMapContext.Provider value={value}>{children}</BaseMapContext.Provider>
}
