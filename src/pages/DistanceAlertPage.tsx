import type { BaseMapBinding, MapCoordinate } from '../Components/map'
import type { NearbyPresence } from '../api/walks'
import type { NavigationPositionFix, WalkNavigationRoute } from '../features/navigation/types'
import { ActiveWalkPage } from './ActiveWalkPage'

type DistanceAlertPageProps = {
  map?: BaseMapBinding
  route?: WalkNavigationRoute | null
  currentPosition?: NavigationPositionFix
  walkedCoordinates?: MapCoordinate[]
  onPause?: () => void
  onStop?: () => void
  onPhoto?: () => void
  distanceMode?: boolean
  onDistanceModeChange?: (checked: boolean) => void
  time?: string
  distance?: string
  alert?: NearbyPresence
}

export function DistanceAlertPage(props: DistanceAlertPageProps) {
  return <ActiveWalkPage {...props} sessionState="distance-alert" presenceMode="distance" presenceEnabled={props.distanceMode ?? true} onPresenceEnabledChange={props.onDistanceModeChange} />
}
