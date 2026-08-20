import { normalizeHeading, shortestHeadingDelta } from './bearing'

export function smoothHeading(current: number | undefined, target: number, alpha = 0.28, threshold = 1.5) {
  const normalizedTarget = normalizeHeading(target)
  if (current === undefined || !Number.isFinite(current)) return normalizedTarget
  const delta = shortestHeadingDelta(current, normalizedTarget)
  if (Math.abs(delta) < threshold) return normalizeHeading(current)
  return normalizeHeading(current + delta * alpha)
}

