export const APP_FRAME_HEIGHT = 820
export const APP_FRAME_VERTICAL_MARGIN = 48

export function appFrameScale(viewportHeight: number) {
  const availableHeight = Math.max(0, viewportHeight - APP_FRAME_VERTICAL_MARGIN)
  return Math.max(0.74, Math.min(1, availableHeight / APP_FRAME_HEIGHT))
}
