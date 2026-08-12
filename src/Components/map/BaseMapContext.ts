import { createContext } from 'react'
import type { BaseMapAdapter, BaseMapScene, MapCoordinate, MapMarker } from './types'

export type BaseMapDefaults = {
  adapter?: BaseMapAdapter
  defaultScene: BaseMapScene
  currentLocation?: MapCoordinate
  requestCurrentLocation: () => Promise<MapCoordinate>
  currentLocationMarker?: Pick<MapMarker, 'label' | 'profileImageSrc'>
  setCurrentLocationMarker: (marker?: Pick<MapMarker, 'label' | 'profileImageSrc'>) => void
}

export const BaseMapContext = createContext<BaseMapDefaults | null>(null)
