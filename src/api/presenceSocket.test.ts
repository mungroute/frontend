import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectPresenceSocket } from './presenceSocket'

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: MockWebSocket[] = []

  readonly url: string
  readyState = MockWebSocket.CONNECTING
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  open() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  receive(data: string) {
    this.onmessage?.({ data })
  }

  close() {
    if (this.readyState === MockWebSocket.CLOSED) return
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }
}

describe('presenceSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('authenticates, subscribes and exchanges presence messages', async () => {
    const onMessage = vi.fn()
    const client = connectPresenceSocket({
      tokenProvider: async () => 'access-token',
      onMessage,
    })
    const socket = MockWebSocket.instances[0]

    expect(client.send({
      sessionId: 27,
      measuredAt: '2026-08-17T12:00:00+09:00',
      lon: 126.978,
      lat: 37.5665,
      accuracy: 7,
      heading: 90,
      stationary: false,
      radiusM: 100,
    })).toBe(false)

    socket.open()
    await vi.waitFor(() => expect(socket.sent[0]).toContain('Authorization:Bearer access-token'))
    socket.receive('CONNECTED\nversion:1.2\n\n\0')
    expect(socket.sent[1]).toContain('destination:/user/queue/presence')

    expect(client.send({
      sessionId: 27,
      measuredAt: '2026-08-17T12:00:04+09:00',
      lon: 126.9781,
      lat: 37.5666,
      accuracy: 6,
      heading: null,
      stationary: false,
      radiusM: 100,
    })).toBe(true)
    expect(socket.sent[2]).toContain('destination:/app/presence')
    expect(socket.sent[2]).toContain('"sessionId":27')

    const response = {
      sessionId: 27,
      updatedAt: '2026-08-17T12:00:04+09:00',
      nextUpdateAfterSeconds: 4,
      nearby: [],
    }
    socket.receive(`MESSAGE\ndestination:/user/queue/presence\n\n${JSON.stringify(response)}\0`)
    expect(onMessage).toHaveBeenCalledWith(response)

    client.close()
  })

  it('keeps one reconnect timer and stops reconnecting after close', async () => {
    vi.useFakeTimers()
    const client = connectPresenceSocket({
      tokenProvider: async () => 'access-token',
      onMessage: vi.fn(),
      reconnectAfterMs: 100,
    })
    const first = MockWebSocket.instances[0]

    first.close()
    first.onclose?.()
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(100)
    expect(MockWebSocket.instances).toHaveLength(2)
    const second = MockWebSocket.instances[1]
    second.open()
    await Promise.resolve()
    second.receive('CONNECTED\nversion:1.2\n\n\0')
    expect(second.sent.filter((value) => value.startsWith('SUBSCRIBE'))).toHaveLength(1)

    first.onclose?.()
    expect(vi.getTimerCount()).toBe(0)
    client.close()
    await vi.advanceTimersByTimeAsync(200)
    expect(MockWebSocket.instances).toHaveLength(2)
  })
})
