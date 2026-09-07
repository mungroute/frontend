import { useMemo, useReducer } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { LockedWalkPresenceMode, NearbyPresence, WalkEndResult, WalkRecordDetail } from '../../api/walks'
import type { MeetCandidate, MeetConnection, MeetRequest } from '../../api/meet'
import { readPendingWalkRoute } from '../navigation/route-storage'
import type { ActiveWalkRouteSnapshot, WalkNavigationRoute, WalkRouteSelection } from '../navigation/types'

type WalkSessionState = {
  walkPresenceMode: LockedWalkPresenceMode | null
  presenceEnabled: boolean
  backendWalkStarted: boolean
  walkStarting: boolean
  walkEndResult: WalkEndResult | undefined
  walkApiError: string | undefined
  walkBackExitOpen: boolean
  nearbyPresence: NearbyPresence | undefined
  meetCandidates: MeetCandidate[]
  meetSearchPending: boolean
  meetRequests: MeetRequest[]
  meetConnection: MeetConnection | undefined
  selectedWalkRecord: WalkRecordDetail | undefined
  pendingWalkSelection: WalkRouteSelection
  activeWalkRoute: WalkNavigationRoute | null
}

type WalkSessionAction = {
  [Key in keyof WalkSessionState]: {
    key: Key
    value: SetStateAction<WalkSessionState[Key]>
  }
}[keyof WalkSessionState]

const reduceWalkSession = (
  state: WalkSessionState,
  action: WalkSessionAction,
): WalkSessionState => {
  const current = state[action.key]
  const next = typeof action.value === 'function'
    ? (action.value as (previous: typeof current) => typeof current)(current)
    : action.value
  if (Object.is(current, next)) return state
  return { ...state, [action.key]: next } as WalkSessionState
}

export function useWalkSessionReducer(restored?: ActiveWalkRouteSnapshot) {
  const [state, dispatch] = useReducer(reduceWalkSession, restored, (snapshot): WalkSessionState => ({
    walkPresenceMode: snapshot?.presenceMode ?? null,
    presenceEnabled: snapshot?.presenceEnabled ?? false,
    backendWalkStarted: Boolean(snapshot),
    walkStarting: false,
    walkEndResult: undefined,
    walkApiError: undefined,
    walkBackExitOpen: false,
    nearbyPresence: undefined,
    meetCandidates: [],
    meetSearchPending: false,
    meetRequests: [],
    meetConnection: undefined,
    selectedWalkRecord: undefined,
    pendingWalkSelection: readPendingWalkRoute(),
    activeWalkRoute: snapshot?.route ?? null,
  }))

  const setters = useMemo(() => {
    const setter = <Key extends keyof WalkSessionState>(
      key: Key,
    ): Dispatch<SetStateAction<WalkSessionState[Key]>> => (
      value => dispatch({ key, value } as WalkSessionAction)
    )

    return {
      setWalkPresenceMode: setter('walkPresenceMode'),
      setPresenceEnabled: setter('presenceEnabled'),
      setBackendWalkStarted: setter('backendWalkStarted'),
      setWalkStarting: setter('walkStarting'),
      setWalkEndResult: setter('walkEndResult'),
      setWalkApiError: setter('walkApiError'),
      setWalkBackExitOpen: setter('walkBackExitOpen'),
      setNearbyPresence: setter('nearbyPresence'),
      setMeetCandidates: setter('meetCandidates'),
      setMeetSearchPending: setter('meetSearchPending'),
      setMeetRequests: setter('meetRequests'),
      setMeetConnection: setter('meetConnection'),
      setSelectedWalkRecord: setter('selectedWalkRecord'),
      setPendingWalkSelection: setter('pendingWalkSelection'),
      setActiveWalkRoute: setter('activeWalkRoute'),
    }
  }, [])

  return { ...state, ...setters }
}
