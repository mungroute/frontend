import { webSocketUrl } from './url'

export type GroupCourseEvent = {
  groupId: number
  type: 'COURSE_SHARED' | 'COURSE_UNSHARED'
  sharedCourseId: number
}

export type GroupCourseSocketClient = { close: () => void }

export type GroupCourseSocketOptions = {
  groupId: number
  tokenProvider: () => Promise<string>
  onEvent: (event: GroupCourseEvent) => void
  reconnectAfterMs?: number
}

export type GroupCourseSocketConnector = (options: GroupCourseSocketOptions) => GroupCourseSocketClient

const frame = (command: string, headers: Record<string, string>, body = '') =>
  `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n')}\n\n${body}\0`

export const connectGroupCourseSocket: GroupCourseSocketConnector = (options) => {
  if (typeof WebSocket === 'undefined') return { close: () => undefined }

  let socket: WebSocket | undefined
  let stopped = false
  let retryTimer: number | undefined
  let buffer = ''

  const scheduleReconnect = () => {
    if (stopped || retryTimer !== undefined) return
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined
      open()
    }, options.reconnectAfterMs ?? 5_000)
  }

  const open = () => {
    if (stopped) return
    const current = new WebSocket(webSocketUrl('/ws'))
    socket = current
    buffer = ''

    current.onopen = () => {
      void options.tokenProvider()
        .then((token) => {
          if (!stopped && socket === current && current.readyState === WebSocket.OPEN) {
            current.send(frame('CONNECT', {
              'accept-version': '1.2',
              'heart-beat': '0,0',
              Authorization: `Bearer ${token}`,
            }))
          }
        })
        .catch(() => current.close())
    }

    current.onmessage = (message) => {
      if (typeof message.data !== 'string') return
      buffer += message.data
      const chunks = buffer.split('\0')
      buffer = chunks.pop() ?? ''
      chunks.forEach((raw) => {
        const normalized = raw.replace(/^\r?\n+/, '')
        if (!normalized.trim()) return
        const separator = normalized.search(/\r?\n\r?\n/)
        const head = separator < 0 ? normalized : normalized.slice(0, separator)
        const body = separator < 0 ? '' : normalized.slice(separator).replace(/^\r?\n\r?\n/, '')
        const command = head.split(/\r?\n/, 1)[0]

        if (command === 'CONNECTED') {
          current.send(frame('SUBSCRIBE', {
            id: `group-${options.groupId}-courses`,
            destination: `/topic/groups/${options.groupId}/courses`,
            ack: 'auto',
          }))
        } else if (command === 'MESSAGE') {
          try {
            const event = JSON.parse(body) as GroupCourseEvent
            if (event.groupId === options.groupId) options.onEvent(event)
          } catch { /* A later valid event can still refresh the page. */ }
        } else if (command === 'ERROR') {
          current.close()
        }
      })
    }
    current.onclose = scheduleReconnect
  }

  open()

  return {
    close() {
      stopped = true
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
      retryTimer = undefined
      socket?.close()
      socket = undefined
    },
  }
}
