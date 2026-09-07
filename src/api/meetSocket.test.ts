import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectMeetSocket } from './meetSocket'

class MockSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSED = 3; static instances: MockSocket[] = []
  readyState = 0; sent: string[] = []
  onopen: (() => void) | null = null; onmessage: ((event: { data: string }) => void) | null = null; onclose: (() => void) | null = null
  constructor(public url: string) { MockSocket.instances.push(this) }
  send(data: string) { this.sent.push(data) }
  open() { this.readyState = 1; this.onopen?.() }
  receive(data: string) { this.onmessage?.({ data }) }
  close() { this.readyState = 3; this.onclose?.() }
}

describe('meetSocket', () => {
  beforeEach(() => { MockSocket.instances = []; vi.stubGlobal('WebSocket', MockSocket) })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('subscribes to private presence and event queues', async () => {
    const onPresence = vi.fn(); const onEvent = vi.fn()
    const client = connectMeetSocket({ tokenProvider: async () => 'token', onPresence, onEvent })
    const socket = MockSocket.instances[0]
    socket.open()
    await vi.waitFor(() => expect(socket.sent[0]).toContain('Authorization:Bearer token'))
    socket.receive('CONNECTED\nversion:1.2\n\n\0')
    expect(socket.sent[1]).toContain('/user/queue/meet-presence')
    expect(socket.sent[2]).toContain('/user/queue/meet-events')
    expect(client.send({ sessionId: 27, measuredAt: '2026-08-17T10:00:00Z', lon: 126.978, lat: 37.5665, accuracy: 7, heading: null, stationary: false, radiusM: 100 })).toBe(true)
    expect(socket.sent[3]).toContain('/app/meet/presence')
    socket.receive('MESSAGE\ndestination:/user/queue/meet-events\n\n{"type":"REQUESTED","request":{}}\0')
    expect(onEvent).toHaveBeenCalled()
    client.close()
  })

  it('does not accumulate reconnect timers or subscriptions', async () => {
    vi.useFakeTimers()
    const client = connectMeetSocket({
      tokenProvider: async () => 'token',
      onPresence: vi.fn(),
      onEvent: vi.fn(),
      reconnectAfterMs: 100,
    })
    const first = MockSocket.instances[0]

    first.close()
    first.onclose?.()
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(100)
    expect(MockSocket.instances).toHaveLength(2)
    const second = MockSocket.instances[1]
    second.open()
    await Promise.resolve()
    second.receive('CONNECTED\nversion:1.2\n\n\0')
    expect(second.sent.filter((value) => value.startsWith('SUBSCRIBE'))).toHaveLength(2)

    first.onclose?.()
    expect(vi.getTimerCount()).toBe(0)
    client.close()
    await vi.advanceTimersByTimeAsync(200)
    expect(MockSocket.instances).toHaveLength(2)
  })
})
