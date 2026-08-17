import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { LocateFixed } from 'lucide-react'
import type { BaseMapBinding, BaseMapInstance, BaseMapScene, MapClickEvent } from './types'
import { BaseMapContext } from './BaseMapContext'
import { requestBrowserLocation } from './geolocation'
import '../../styles/components/base-map-viewport.css'

type BaseMapViewportProps = {
  ariaLabel: string
  className?: string
  fallback: {
    src: string
    alt?: string
    overlay?: ReactNode
    hideOverlayWhenReady?: boolean
  }
  map?: BaseMapBinding
  children?: ReactNode
  showLocationControl?: boolean
  sceneOverlay?: Partial<Pick<BaseMapScene, 'center' | 'zoom' | 'markers' | 'routes'>>
  onMapClick?: (event: MapClickEvent) => void
  mapClickLabel?: string
}

export function BaseMapViewport({
  ariaLabel,
  className = '',
  fallback,
  map,
  children,
  showLocationControl = false,
  sceneOverlay,
  onMapClick,
  mapClickLabel = '지도에 지점 추가',
}: BaseMapViewportProps) {
  const defaults = useContext(BaseMapContext)
  const suppliedScene = map?.scene ?? defaults?.defaultScene
  const [locationScene, setLocationScene] = useState<{ source?: typeof suppliedScene; scene: NonNullable<typeof suppliedScene> }>()
  const localBaseScene = locationScene && locationScene.source === suppliedScene ? locationScene.scene : suppliedScene
  const localScene = useMemo(() => {
    if (!localBaseScene || !sceneOverlay) return localBaseScene
    return {
      ...localBaseScene,
      center: sceneOverlay.center ?? localBaseScene.center,
      zoom: sceneOverlay.zoom ?? localBaseScene.zoom,
      markers: [...(localBaseScene.markers ?? []), ...(sceneOverlay.markers ?? [])],
      routes: [...(localBaseScene.routes ?? []), ...(sceneOverlay.routes ?? [])],
    }
  }, [localBaseScene, sceneOverlay])
  const resolvedMap = (map?.adapter && localScene)
    ? { adapter: map.adapter, scene: localScene }
    : (defaults?.adapter && localScene ? { adapter: defaults.adapter, scene: localScene } : undefined)
  const canvasRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<BaseMapInstance>(null)
  const clickHandlerRef = useRef(onMapClick)
  const renderedSceneRef = useRef(resolvedMap?.scene)
  const [providerReady, setProviderReady] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationFailed, setLocationFailed] = useState(false)
  const adapter = resolvedMap?.adapter
  const scene = resolvedMap?.scene

  useEffect(() => {
    clickHandlerRef.current = onMapClick
    instanceRef.current?.setClickHandler?.(onMapClick ? (event) => clickHandlerRef.current?.(event) : undefined)
  }, [onMapClick])

  const locate = async () => {
    setIsLocating(true)
    setLocationFailed(false)
    try {
      const coordinate = await (defaults?.requestCurrentLocation ?? requestBrowserLocation)()
      const current = localBaseScene
      setLocationScene({ source: suppliedScene, scene: {
        ...(current ?? defaults?.defaultScene ?? { center: coordinate, zoom: 17 }),
        center: coordinate,
        zoom: Math.max(current?.zoom ?? defaults?.defaultScene.zoom ?? 17, 17),
        markers: [
          ...(current?.markers?.filter((marker) => marker.kind !== 'current-location') ?? []),
          { id: 'current-location', position: coordinate, kind: 'current-location', ...defaults?.currentLocationMarker },
        ],
      } })
    } catch {
      setLocationFailed(true)
    } finally {
      setIsLocating(false)
    }
  }

  useEffect(() => {
    renderedSceneRef.current = scene
  }, [scene])

  useEffect(() => {
    const initialScene = renderedSceneRef.current

    if (!adapter || !initialScene || !canvasRef.current) {
      instanceRef.current = null
      setProviderReady(false)
      return
    }

    let active = true
    setProviderReady(false)
    const instance = adapter.mount(canvasRef.current, initialScene)
    instanceRef.current = instance
    instance.setClickHandler?.(clickHandlerRef.current ? (event) => clickHandlerRef.current?.(event) : undefined)
    instance.ready.then(
      () => {
        if (active) setProviderReady(true)
      },
      () => {
        if (active) setProviderReady(false)
      },
    )

    return () => {
      active = false
      instance.destroy()
      instanceRef.current = null
    }
  }, [adapter])

  useEffect(() => {
    if (scene) {
      instanceRef.current?.update(scene)
    }
  }, [scene])

  const addFallbackPoint = (event: MouseEvent<HTMLButtonElement>) => {
    if (!onMapClick) return
    const rect = event.currentTarget.getBoundingClientRect()
    const keyboardActivated = event.detail === 0
    const xPercent = keyboardActivated || !rect.width ? 50 : ((event.clientX - rect.left) / rect.width) * 100
    const yPercent = keyboardActivated || !rect.height ? 50 : ((event.clientY - rect.top) / rect.height) * 100
    onMapClick({
      coordinate: localScene?.center ?? { latitude: 0, longitude: 0 },
      xPercent: Math.min(97, Math.max(3, xPercent)),
      yPercent: Math.min(97, Math.max(3, yPercent)),
    })
  }

  return (
    <section
      className={`base-map-viewport ${className}`.trim()}
      aria-label={ariaLabel}
      data-map-provider={providerReady ? 'adapter' : 'static'}
    >
      {!providerReady && (
        <div className="base-map-viewport__fallback" data-testid="base-map-fallback">
          <img className="base-map-viewport__fallback-image" src={fallback.src} alt={fallback.alt ?? ''} />
        </div>
      )}
      <div ref={canvasRef} className="base-map-viewport__canvas" />
      {!adapter && onMapClick && (
        <button
          type="button"
          className="base-map-viewport__static-click-target"
          aria-label={mapClickLabel}
          onClick={addFallbackPoint}
        />
      )}
      {fallback.overlay && (!providerReady || !fallback.hideOverlayWhenReady) && <div className="base-map-viewport__fallback-overlay">{fallback.overlay}</div>}
      {children && <div className="base-map-viewport__overlay">{children}</div>}
      {showLocationControl && (
        <div className="base-map-viewport__location-control">
          <button
            type="button"
            aria-label="내 위치로 이동"
            aria-busy={isLocating}
            className={locationFailed ? 'base-map-viewport__location-button base-map-viewport__location-button--error' : 'base-map-viewport__location-button'}
            onClick={() => void locate()}
          >
            <LocateFixed size={23} aria-hidden="true" />
            <span>{isLocating ? '찾는 중' : '내 위치'}</span>
          </button>
          {locationFailed && <span className="base-map-viewport__location-error" role="status">위치를 확인해 주세요</span>}
        </div>
      )}
    </section>
  )
}
