import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { BaseMapBinding, BaseMapInstance } from './types'
import '../../styles/components/base-map-viewport.css'

type BaseMapViewportProps = {
  ariaLabel: string
  className?: string
  fallback: {
    src: string
    alt?: string
    overlay?: ReactNode
  }
  map?: BaseMapBinding
  children?: ReactNode
}

export function BaseMapViewport({
  ariaLabel,
  className = '',
  fallback,
  map,
  children,
}: BaseMapViewportProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<BaseMapInstance>(null)
  const renderedSceneRef = useRef(map?.scene)
  const [providerReady, setProviderReady] = useState(false)
  const adapter = map?.adapter
  const scene = map?.scene

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

  return (
    <section
      className={`base-map-viewport ${className}`.trim()}
      aria-label={ariaLabel}
      data-map-provider={providerReady ? 'adapter' : 'static'}
    >
      {!providerReady && (
        <div className="base-map-viewport__fallback" data-testid="base-map-fallback">
          <img className="base-map-viewport__fallback-image" src={fallback.src} alt={fallback.alt ?? ''} />
          {fallback.overlay && <div className="base-map-viewport__fallback-overlay">{fallback.overlay}</div>}
        </div>
      )}
      <div ref={canvasRef} className="base-map-viewport__canvas" />
      {children && <div className="base-map-viewport__overlay">{children}</div>}
    </section>
  )
}
