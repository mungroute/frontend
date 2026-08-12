import { useEffect, useRef, useState } from 'react'
import type { MapCoordinate } from '../../Components/map'
import { GEOLOCATION_OPTIONS } from '../../Components/map/geolocation'

const EARTH_RADIUS_METERS = 6_371_000
const toRadians = (degrees: number) => degrees * Math.PI / 180

export function distanceBetween(from: MapCoordinate, to: MapCoordinate) {
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function formatWalkTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor(totalSeconds % 3600 / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function formatWalkDistance(distanceMeters: number) {
  return `${(distanceMeters / 1000).toFixed(2)}km`
}

export function useWalkTracker(isTracking: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [distanceMeters, setDistanceMeters] = useState(0)
  const lastCoordinateRef = useRef<MapCoordinate | undefined>(undefined)

  useEffect(() => {
    if (!isTracking) {
      lastCoordinateRef.current = undefined
      return
    }

    const timerId = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000)
    const watchId = typeof navigator.geolocation?.watchPosition === 'function'
      ? navigator.geolocation.watchPosition(({ coords }) => {
        const coordinate = { latitude: coords.latitude, longitude: coords.longitude }
        const previous = lastCoordinateRef.current
        lastCoordinateRef.current = coordinate
        if (!previous) return

        const segmentMeters = distanceBetween(previous, coordinate)
        // Ignore tiny GPS jitter and clearly invalid jumps.
        if (segmentMeters >= 2 && segmentMeters <= 250) {
          setDistanceMeters((current) => current + segmentMeters)
        }
      }, () => undefined, GEOLOCATION_OPTIONS)
      : undefined

    return () => {
      window.clearInterval(timerId)
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
      lastCoordinateRef.current = undefined
    }
  }, [isTracking])

  const reset = () => {
    setElapsedSeconds(0)
    setDistanceMeters(0)
    lastCoordinateRef.current = undefined
  }

  return {
    elapsedSeconds,
    distanceMeters,
    formattedTime: formatWalkTime(elapsedSeconds),
    formattedDistance: formatWalkDistance(distanceMeters),
    reset,
  }
}
