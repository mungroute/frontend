export type MapCoordinate = {
  latitude: number
  longitude: number
}

export type MapMarker = {
  id: string
  position: MapCoordinate
  kind?: 'current-location' | 'start' | 'finish' | 'default'
  label?: string
  profileImageSrc?: string
  revealAfterDraw?: string
}

export type MapRoute = {
  id: string
  coordinates: MapCoordinate[]
  color?: string
  width?: number
  outlineColor?: string
  outlineWidth?: number
  lineCap?: 'butt' | 'round' | 'square'
  animated?: boolean
  pulse?: boolean
  interactive?: boolean
  interactionId?: string
  selected?: boolean
  drawOnLoad?: boolean
  drawGroupId?: string
  drawOrder?: number
  chevrons?: boolean
}

export type BaseMapScene = {
  center: MapCoordinate
  zoom: number
  markers?: MapMarker[]
  routes?: MapRoute[]
}

export type MapClickEvent = {
  coordinate: MapCoordinate
  xPercent: number
  yPercent: number
  featureId?: string
}

export type BaseMapInstance = {
  ready: Promise<void>
  update: (scene: BaseMapScene) => void
  setClickHandler?: (handler?: (event: MapClickEvent) => void) => void
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
