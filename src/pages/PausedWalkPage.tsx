import type { BaseMapBinding, MapCoordinate } from '../Components/map'
import type { LockedWalkPresenceMode } from '../api/walks'
import type { NavigationPositionFix, WalkNavigationRoute } from '../features/navigation/types'
import { ActiveWalkPage } from './ActiveWalkPage'

type PausedWalkPageProps = {
  map?: BaseMapBinding
  route?: WalkNavigationRoute | null
  currentPosition?: NavigationPositionFix
  walkedCoordinates?: MapCoordinate[]
  dogName?: string
  onResume?: () => void
  onStop?: () => void
  navigationVoiceEnabled?: boolean
  onNavigationVoiceEnabledChange?: (enabled: boolean) => void
  distanceMode?: boolean
  onDistanceModeChange?: (checked: boolean) => void
  presenceMode?: LockedWalkPresenceMode | null
  presenceEnabled?: boolean
  onPresenceEnabledChange?: (enabled: boolean) => void
  time?: string
  distance?: string
}

export function PausedWalkPage(props: PausedWalkPageProps) {
  return <ActiveWalkPage {...props} sessionState="paused" />
}
