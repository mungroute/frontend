import { beforeEach, describe, expect, it, vi } from 'vitest'
import { connectGroupCourseSocket } from './groupCourseSocket'

class MockWebSocket {
  static OPEN = 1
  static CONNECTING = 0
  static instances: MockWebSocket[] = []
  readyState = MockWebSocket.CONNECTING
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null

  constructor(readonly url: string) { MockWebSocket.instances.push(this) }
  send(value: string) { this.sent.push(value) }
  open() { this.readyState = MockWebSocket.OPEN; this.onopen?.() }
  receive(value: string) { this.onmessage?.({ data: value }) }
  close() { this.readyState = 3; this.onclose?.() }
}

describe('connectGroupCourseSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  it('subscribes to the selected group and forwards course events', async () => {
    const onEvent = vi.fn()
    const client = connectGroupCourseSocket({
      groupId: 10,
      tokenProvider: async () => 'token',
      onEvent,
    })
    const socket = MockWebSocket.instances[0]

    socket.open()
    await Promise.resolve()
    expect(socket.sent[0]).toContain('Authorization:Bearer token')

    socket.receive('CONNECTED\nversion:1.2\n\n\0')
    expect(socket.sent[1]).toContain('destination:/topic/groups/10/courses')

    socket.receive('MESSAGE\ndestination:/topic/groups/10/courses\n\n{"groupId":10,"type":"COURSE_SHARED","sharedCourseId":32}\0')
    expect(onEvent).toHaveBeenCalledWith({ groupId: 10, type: 'COURSE_SHARED', sharedCourseId: 32 })

    client.close()
  })
})
