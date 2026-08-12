import { useContext } from 'react'
import { BaseMapContext } from './BaseMapContext'
import { requestBrowserLocation } from './geolocation'

export function useMapLocation() {
  const context = useContext(BaseMapContext)
  return {
    currentLocation: context?.currentLocation,
    requestCurrentLocation: context?.requestCurrentLocation ?? requestBrowserLocation,
    currentLocationMarker: context?.currentLocationMarker,
    setCurrentLocationMarker: context?.setCurrentLocationMarker ?? (() => undefined),
  }
}
