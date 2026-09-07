import type { PresenceUpdatePayload, PresenceUpdateResult } from './walks'
import { webSocketUrl } from './url'

type PresenceSocketOptions = {
  tokenProvider: () => Promise<string>
  onMessage: (response: PresenceUpdateResult) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: Error) => void
  reconnectAfterMs?: number
}

export type PresenceSocketClient = {
  send: (payload: PresenceUpdatePayload) => boolean
  close: () => void
  isConnected: () => boolean
}

type StompFrame = {
  command: string
  headers: Record<string, string>
  body: string
}

const encodeFrame = (command: string, headers: Record<string, string>, body = '') => {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`)
  return `${command}\n${headerLines.join('\n')}\n\n${body}\0`
}

const parseFrame = (raw: string): StompFrame | undefined => {
  const normalized = raw.replace(/^\r?\n+/, '')
  if (!normalized.trim()) return undefined
  const separator = normalized.search(/\r?\n\r?\n/)
  const head = separator < 0 ? normalized : normalized.slice(0, separator)
  const body = separator < 0 ? '' : normalized.slice(separator).replace(/^\r?\n\r?\n/, '')
  const lines = head.split(/\r?\n/)
  const command = lines.shift()
  if (!command) return undefined
  const headers = Object.fromEntries(lines.map((line) => {
    const colon = line.indexOf(':')
    return colon < 0 ? [line, ''] : [line.slice(0, colon), line.slice(colon + 1)]
  }))
  return { command, headers, body }
}

export function connectPresenceSocket(options: PresenceSocketOptions): PresenceSocketClient {
  let socket: WebSocket | undefined
  let connected = false
  let stopped = false
  let reconnectTimer: number | undefined
  let frameBuffer = ''

  const setConnected = (value: boolean) => {
    if (connected === value) return
    connected = value
    options.onConnectionChange?.(value)
  }

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer !== undefined) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined
      void open()
    }, options.reconnectAfterMs ?? 5_000)
  }

  const handleFrame = (frame: StompFrame) => {
    if (frame.command === 'CONNECTED') {
      setConnected(true)
      socket?.send(encodeFrame('SUBSCRIBE', {
        id: 'presence-updates',
        destination: '/user/queue/presence',
        ack: 'auto',
      }))
      return
    }
    if (frame.command === 'MESSAGE') {
      try {
        options.onMessage(JSON.parse(frame.body) as PresenceUpdateResult)
      } catch {
        options.onError?.(new Error('실시간 거리 알림 응답을 읽을 수 없습니다.'))
      }
      return
    }
    if (frame.command === 'ERROR') {
      options.onError?.(new Error(frame.body || frame.headers.message || '실시간 연결 오류가 발생했습니다.'))
      socket?.close()
    }
  }

  async function open() {
    if (stopped || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
    frameBuffer = ''
    const nextSocket = new WebSocket(webSocketUrl('/ws'))
    socket = nextSocket
    nextSocket.onopen = () => {
      void options.tokenProvider()
        .then((token) => {
          if (stopped || socket !== nextSocket || nextSocket.readyState !== WebSocket.OPEN) return
          nextSocket.send(encodeFrame('CONNECT', {
            'accept-version': '1.2',
            'heart-beat': '0,0',
            Authorization: `Bearer ${token}`,
          }))
        })
        .catch((error: unknown) => {
          options.onError?.(error instanceof Error ? error : new Error('실시간 연결 인증에 실패했습니다.'))
          nextSocket.close()
        })
    }
    nextSocket.onmessage = (event) => {
      if (typeof event.data !== 'string') return
      frameBuffer += event.data
      const frames = frameBuffer.split('\0')
      frameBuffer = frames.pop() ?? ''
      frames.forEach((rawFrame) => {
        const frame = parseFrame(rawFrame)
        if (frame) handleFrame(frame)
      })
    }
    nextSocket.onerror = () => {
      options.onError?.(new Error('실시간 연결을 사용할 수 없어 REST 방식으로 전환합니다.'))
    }
    nextSocket.onclose = () => {
      if (socket !== nextSocket) return
      socket = undefined
      setConnected(false)
      scheduleReconnect()
    }
  }

  void open()

  return {
    send(payload) {
      if (!connected || socket?.readyState !== WebSocket.OPEN) return false
      socket.send(encodeFrame('SEND', {
        destination: '/app/presence',
        'content-type': 'application/json',
      }, JSON.stringify(payload)))
      return true
    },
    close() {
      stopped = true
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      reconnectTimer = undefined
      setConnected(false)
      socket?.close()
      socket = undefined
    },
    isConnected() {
      return connected
    },
  }
}
