export function resolveMapStyleUrl(styleUrl?: string, mapTilerKey?: string) {
  const configured = styleUrl?.trim()
  if (!configured) return undefined
  const key = mapTilerKey?.trim()
  if (!key) return configured
  try {
    const url = new URL(configured)
    if (url.hostname === 'api.maptiler.com' && !url.searchParams.has('key')) {
      url.searchParams.set('key', key)
      return url.toString()
    }
  } catch {
    return configured
  }
  return configured
}
