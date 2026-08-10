import { createContext } from 'react'
import type { BaseMapAdapter, BaseMapScene } from './types'

export type BaseMapDefaults = {
  adapter?: BaseMapAdapter
  defaultScene: BaseMapScene
}

export const BaseMapContext = createContext<BaseMapDefaults | null>(null)
