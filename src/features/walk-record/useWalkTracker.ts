import { useEffect, useRef, useState } from 'react'
import type { MapCoordinate } from '../../Components/map'
import { GEOLOCATION_OPTIONS } from '../../Components/map/geolocation'
import { getDevLocationOverride } from '../../utils/devLocationOverride'
import type { NavigationPositionFix } from '../navigation/types'

const EARTH_RADIUS_METERS = 6_371_000
const MAX_USABLE_ACCURACY_METERS = 40
const MAX_WALKING_SPEED_METERS_PER_SECOND = 4.5
const MAX_SINGLE_SEGMENT_METERS = 80
const toRadians = (degrees: number) => degrees * Math.PI / 180

type AcceptedPosition = {
  coordinate: MapCoordinate
  accuracy: number
  observedAt: number
}

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

export type TrackedWalkPoint = MapCoordinate & {
  recordedAt: string
  accuracy: number
}

export type TrackedPresenceFix = TrackedWalkPoint & {
  heading: number | null
  stationary: boolean
}

export type GpsSignal = 'waiting' | 'good' | 'weak' | 'error'

export function useWalkTracker(
  isTracking: boolean,
  onPoint?: (point: TrackedWalkPoint) => void | Promise<void>,
  onPresenceFix?: (point: TrackedPresenceFix) => void | Promise<void>,
  locationOverride?: MapCoordinate,
) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [distanceMeters, setDistanceMeters] = useState(0)
  const [walkedCoordinates, setWalkedCoordinates] = useState<MapCoordinate[]>([])
  const [gpsSignal, setGpsSignal] = useState<GpsSignal>('waiting')
  const [currentPosition, setCurrentPosition] = useState<NavigationPositionFix>()
  const lastAcceptedPositionRef = useRef<AcceptedPosition | undefined>(undefined)
  const lastObservedPositionRef = useRef<AcceptedPosition | undefined>(undefined)
  const lastPresenceSentAtRef = useRef<number | undefined>(undefined)
  const onPointRef = useRef(onPoint)
  const onPresenceFixRef = useRef(onPresenceFix)
  const overrideLatitude = locationOverride?.latitude
  const overrideLongitude = locationOverride?.longitude

  useEffect(() => {
    onPointRef.current = onPoint
  }, [onPoint])

  useEffect(() => {
    onPresenceFixRef.current = onPresenceFix
  }, [onPresenceFix])

  useEffect(() => {
    if (!isTracking) {
      lastAcceptedPositionRef.current = undefined
      lastObservedPositionRef.current = undefined
      lastPresenceSentAtRef.current = undefined
      return
    }

    const timerId = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000)
    const handlePosition: PositionCallback = ({ coords, timestamp }) => {
        const coordinate = { latitude: coords.latitude, longitude: coords.longitude }
        const recordedAt = new Date().toISOString()
        const accuracy = Number.isFinite(coords.accuracy)
          ? Math.min(9999.9, Math.max(0, coords.accuracy))
          : 9999.9

        // Low-quality fixes are not allowed to move the last accepted point. If they
        // did, the next good fix would draw a long straight line across the map.
        if (accuracy > MAX_USABLE_ACCURACY_METERS) {
          setGpsSignal('weak')
          return
        }

        setGpsSignal('good')
        const observedAt = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now()
        const navigationFix: NavigationPositionFix = {
          coordinate,
          accuracy,
          observedAt,
          heading: Number.isFinite(coords.heading) && coords.heading !== null
            ? Math.min(359.99, Math.max(0, coords.heading))
            : null,
          speed: Number.isFinite(coords.speed) && coords.speed !== null && coords.speed >= 0
            ? coords.speed
            : null,
        }
        const previousObserved = lastObservedPositionRef.current
        const observedElapsedSeconds = previousObserved
          ? Math.max((observedAt - previousObserved.observedAt) / 1000, 0.25)
          : undefined
        const observedDistanceMeters = previousObserved
          ? distanceBetween(previousObserved.coordinate, coordinate)
          : undefined
        const stationary = observedDistanceMeters !== undefined
          && observedElapsedSeconds !== undefined
          && observedDistanceMeters / observedElapsedSeconds < 0.5
        lastObservedPositionRef.current = { coordinate, accuracy, observedAt }

        const presenceIntervalMs = stationary ? 10_000 : 4_000
        const lastPresenceSentAt = lastPresenceSentAtRef.current
        if (lastPresenceSentAt === undefined || observedAt - lastPresenceSentAt >= presenceIntervalMs) {
          lastPresenceSentAtRef.current = observedAt
          const heading = Number.isFinite(coords.heading) && coords.heading !== null
            ? Math.min(359.99, Math.max(0, coords.heading))
            : null
          void onPresenceFixRef.current?.({
            ...coordinate,
            recordedAt,
            accuracy,
            heading,
            stationary,
          })
        }

        const previous = lastAcceptedPositionRef.current
        if (!previous) {
          lastAcceptedPositionRef.current = { coordinate, accuracy, observedAt }
          setCurrentPosition(navigationFix)
          setWalkedCoordinates((current) => [...current, coordinate])
          void onPointRef.current?.({
            ...coordinate,
            recordedAt,
            accuracy,
          })
          return
        }

        const segmentMeters = distanceBetween(previous.coordinate, coordinate)
        const elapsedSeconds = Math.max((observedAt - previous.observedAt) / 1000, 0.25)
        const speedMetersPerSecond = segmentMeters / elapsedSeconds
        const minimumMovementMeters = Math.max(
          3,
          Math.min(10, Math.max(previous.accuracy, accuracy) * 0.25),
        )

        // Ignore stationary GPS jitter, implausibly fast movement and one-off jumps.
        // Rejected fixes never become the next segment's starting point.
        if (
          segmentMeters >= minimumMovementMeters
          && segmentMeters <= MAX_SINGLE_SEGMENT_METERS
          && speedMetersPerSecond <= MAX_WALKING_SPEED_METERS_PER_SECOND
        ) {
          lastAcceptedPositionRef.current = { coordinate, accuracy, observedAt }
          setCurrentPosition(navigationFix)
          setDistanceMeters((current) => current + segmentMeters)
          setWalkedCoordinates((current) => [...current, coordinate])
          void onPointRef.current?.({
            ...coordinate,
            recordedAt,
            accuracy,
          })
        }
      }
    const overriddenLocation = overrideLatitude !== undefined && overrideLongitude !== undefined
      ? { latitude: overrideLatitude, longitude: overrideLongitude }
      : getDevLocationOverride()
    let overrideIntervalId: number | undefined
    const watchId = overriddenLocation
      ? undefined
      : typeof navigator.geolocation?.watchPosition === 'function'
        ? navigator.geolocation.watchPosition(handlePosition, () => setGpsSignal('error'), GEOLOCATION_OPTIONS)
        : undefined

    if (overriddenLocation) {
      const reportOverride = () => handlePosition({
        timestamp: Date.now(),
        coords: {
          latitude: overriddenLocation.latitude,
          longitude: overriddenLocation.longitude,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        toJSON: () => ({}),
      })
      reportOverride()
      overrideIntervalId = window.setInterval(reportOverride, 4_000)
    }

    return () => {
      window.clearInterval(timerId)
      if (overrideIntervalId !== undefined) window.clearInterval(overrideIntervalId)
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
      lastAcceptedPositionRef.current = undefined
      lastObservedPositionRef.current = undefined
      lastPresenceSentAtRef.current = undefined
    }
  }, [isTracking, overrideLatitude, overrideLongitude])

  const reset = () => {
    setElapsedSeconds(0)
    setDistanceMeters(0)
    setWalkedCoordinates([])
    setCurrentPosition(undefined)
    lastAcceptedPositionRef.current = undefined
    lastObservedPositionRef.current = undefined
    lastPresenceSentAtRef.current = undefined
  }

  return {
    elapsedSeconds,
    distanceMeters,
    formattedTime: formatWalkTime(elapsedSeconds),
    formattedDistance: formatWalkDistance(distanceMeters),
    walkedCoordinates,
    currentPosition,
    gpsSignal,
    reset,
  }
}
