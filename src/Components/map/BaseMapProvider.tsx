import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { BaseMapContext } from './BaseMapContext'
import type { BaseMapAdapter, BaseMapScene } from './types'

type BaseMapProviderProps = {
  adapter?: BaseMapAdapter
  defaultScene: BaseMapScene
  children: ReactNode
}

export function BaseMapProvider({ adapter, defaultScene, children }: BaseMapProviderProps) {
  const value = useMemo(() => ({ adapter, defaultScene }), [adapter, defaultScene])
  return <BaseMapContext.Provider value={value}>{children}</BaseMapContext.Provider>
}
