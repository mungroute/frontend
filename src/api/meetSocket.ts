import type { MeetEvent, MeetPresenceResult } from './meet'
import type { PresenceUpdatePayload } from './walks'

export type MeetSocketClient = { send: (payload: PresenceUpdatePayload) => boolean; close: () => void }

type Options = {
  tokenProvider: () => Promise<string>
  onPresence: (response: MeetPresenceResult) => void
  onEvent: (event: MeetEvent) => void
}

const frame = (command: string, headers: Record<string, string>, body = '') =>
  `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n')}\n\n${body}\0`

export function connectMeetSocket(options: Options): MeetSocketClient {
  let socket: WebSocket | undefined
  let connected = false
  let stopped = false
  let retry: number | undefined
  let buffer = ''

  const open = () => {
    if (stopped) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const current = new WebSocket(`${protocol}//${window.location.host}/ws`)
    socket = current
    current.onopen = () => void options.tokenProvider().then((token) => {
      if (!stopped && current.readyState === WebSocket.OPEN) current.send(frame('CONNECT', {
        'accept-version': '1.2', 'heart-beat': '0,0', Authorization: `Bearer ${token}`,
      }))
    }).catch(() => current.close())
    current.onmessage = (event) => {
      if (typeof event.data !== 'string') return
      buffer += event.data
      const chunks = buffer.split('\0')
      buffer = chunks.pop() ?? ''
      chunks.forEach((raw) => {
        const normalized = raw.replace(/^\r?\n+/, '')
        const separator = normalized.search(/\r?\n\r?\n/)
        const head = separator < 0 ? normalized : normalized.slice(0, separator)
        const body = separator < 0 ? '' : normalized.slice(separator).replace(/^\r?\n\r?\n/, '')
        const lines = head.split(/\r?\n/)
        const command = lines.shift()
        const headers = Object.fromEntries(lines.map((line) => {
          const colon = line.indexOf(':')
          return [line.slice(0, colon), line.slice(colon + 1)]
        }))
        if (command === 'CONNECTED') {
          connected = true
          current.send(frame('SUBSCRIBE', { id: 'meet-presence', destination: '/user/queue/meet-presence', ack: 'auto' }))
          current.send(frame('SUBSCRIBE', { id: 'meet-events', destination: '/user/queue/meet-events', ack: 'auto' }))
        } else if (command === 'MESSAGE') {
          try {
            const payload = JSON.parse(body)
            if (headers.destination?.includes('meet-events')) options.onEvent(payload as MeetEvent)
            else options.onPresence(payload as MeetPresenceResult)
          } catch { /* REST fallback remains active */ }
        } else if (command === 'ERROR') current.close()
      })
    }
    current.onclose = () => {
      connected = false
      if (!stopped) retry = window.setTimeout(open, 5_000)
    }
  }
  open()
  return {
    send(payload) {
      if (!connected || socket?.readyState !== WebSocket.OPEN) return false
      socket.send(frame('SEND', { destination: '/app/meet/presence', 'content-type': 'application/json' }, JSON.stringify(payload)))
      return true
    },
    close() {
      stopped = true
      if (retry !== undefined) window.clearTimeout(retry)
      connected = false
      socket?.close()
    },
  }
}
