export type MapCoordinate = {
  latitude: number
  longitude: number
}

export type MapMarker = {
  id: string
  position: MapCoordinate
  kind?: 'current-location' | 'start' | 'finish' | 'default'
}

export type MapRoute = {
  id: string
  coordinates: MapCoordinate[]
  color?: string
  width?: number
}

export type BaseMapScene = {
  center: MapCoordinate
  zoom: number
  markers?: MapMarker[]
  routes?: MapRoute[]
}

export type BaseMapInstance = {
  ready: Promise<void>
  update: (scene: BaseMapScene) => void
  destroy: () => void
}

/** Provider-neutral seam. A future VWorld adapter owns all SDK-specific code. */
export type BaseMapAdapter = {
  mount: (container: HTMLElement, initialScene: BaseMapScene) => BaseMapInstance
}

export type BaseMapBinding = {
  adapter: BaseMapAdapter
  scene: BaseMapScene
}
