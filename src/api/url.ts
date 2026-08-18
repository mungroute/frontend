const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

export function apiUrl(path: string) {
  if (!apiBaseUrl) return path
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function webSocketUrl(path: string) {
  const url = new URL(apiUrl(path), window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
