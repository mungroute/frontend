import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { BaseMapAdapter } from './types'
import { BaseMapProvider } from './BaseMapProvider'
import { DEFAULT_VWORLD_SCENE } from './defaultScene'

export function VWorldMapProvider({ apiKey, children }: { apiKey?: string; children: ReactNode }) {
  const [adapter, setAdapter] = useState<BaseMapAdapter>()

  useEffect(() => {
    let active = true
    const normalizedKey = apiKey?.trim()
    if (!normalizedKey) {
      Promise.resolve().then(() => { if (active) setAdapter(undefined) })
      return () => { active = false }
    }

    import('./VWorldMapAdapter').then(({ createVWorldMapAdapter }) => {
      if (active) setAdapter(createVWorldMapAdapter({ apiKey: normalizedKey }))
    }).catch(() => {
      if (active) setAdapter(undefined)
    })

    return () => { active = false }
  }, [apiKey])

  return <BaseMapProvider adapter={adapter} defaultScene={DEFAULT_VWORLD_SCENE}>{children}</BaseMapProvider>
}
