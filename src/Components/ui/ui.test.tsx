import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button, DraggableSheet, SelectionCard, Switch, TimePicker } from '.'

describe('shared UI', () => {
  it('blocks a loading button and exposes its busy state', () => {
    render(<Button loading>저장 중</Button>)
    expect(screen.getByRole('button', { name: '저장 중' })).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('keeps its base and variant styles when a screen adds a custom class', () => {
    render(<Button className="screen-action">저장</Button>)

    expect(screen.getByRole('button', { name: '저장' })).toHaveClass('ui-button', 'ui-button--primary', 'screen-action')
  })

  it('reports selected cards without relying on color alone', () => {
    render(<SelectionCard selected title="저녁 남산길" onClick={() => undefined} />)
    expect(screen.getByRole('button', { name: /저녁 남산길/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles the distance mode', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} label="거리두기 모드" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('changes the time in five-minute steps and respects boundaries', () => {
    const onChange = vi.fn()
    render(<TimePicker value={30} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '5분 늘리기' }))
    expect(onChange).toHaveBeenCalledWith(35)
  })

  it('changes the time when the wheel is scrolled by touch or pointer', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const { container } = render(<TimePicker value={30} onChange={onChange} />)
    const wheel = within(container).getByRole('spinbutton')
    vi.advanceTimersByTime(0)

    Object.defineProperty(wheel, 'scrollTop', { configurable: true, value: 260 })
    fireEvent.scroll(wheel)

    expect(within(wheel).getByText('35분')).toHaveClass('ui-time-picker__option--selected')
    vi.advanceTimersByTime(150)

    expect(onChange).toHaveBeenCalledWith(35)
    vi.useRealTimers()
  })

  it('keeps the compact time picker scrollable without separate step controls', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const { container } = render(<TimePicker value={30} onChange={onChange} variant="compact" />)
    const wheel = within(container).getByRole('spinbutton')
    vi.advanceTimersByTime(0)

    expect(within(container).queryByRole('button', { name: '5분 줄이기' })).not.toBeInTheDocument()
    expect(within(container).queryByRole('button', { name: '5분 늘리기' })).not.toBeInTheDocument()

    Object.defineProperty(wheel, 'scrollTop', { configurable: true, value: 180 })
    fireEvent.scroll(wheel)
    vi.advanceTimersByTime(150)

    expect(onChange).toHaveBeenCalledWith(35)
    vi.useRealTimers()
  })

  it('does not treat initial wheel positioning as a user selection', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: function (this: HTMLElement) {
        Object.defineProperty(this, 'scrollTop', { configurable: true, value: 0 })
        this.dispatchEvent(new Event('scroll'))
      },
    })

    render(<TimePicker value={30} onChange={onChange} variant="compact" />)
    vi.advanceTimersByTime(150)

    expect(onChange).not.toHaveBeenCalled()
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
    vi.useRealTimers()
  })

  it('stops an upward sheet drag when its content boundary reaches the viewport', () => {
    const { container } = render(
      <main className="journey-page">
        <DraggableSheet upwardDragBoundarySelector=".drag-limit" upwardDragBoundarySpacing={32}>
          시트 내용
          <span className="drag-limit">마지막 동작</span>
        </DraggableSheet>
      </main>,
    )
    const viewport = container.querySelector('main') as HTMLElement
    const sheet = screen.getByText('시트 내용').closest('section') as HTMLElement
    const boundary = screen.getByText('마지막 동작')
    const handle = screen.getByRole('button', { name: '패널 높이 조절' })
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 800 },
      getBoundingClientRect: { configurable: true, value: () => ({ top: 0 }) },
    })
    Object.defineProperties(sheet, {
      getBoundingClientRect: {
        configurable: true,
        value: () => {
          const offset = Number(sheet.style.transform.match(/-?\d+/)?.[0] ?? 0)
          return { top: 672 + offset }
        },
      },
    })
    Object.defineProperty(boundary, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        const offset = Number(sheet.style.transform.match(/-?\d+/)?.[0] ?? 0)
        return { bottom: 1050 + offset }
      },
    })

    for (let index = 0; index < 10; index += 1) fireEvent.keyDown(handle, { key: 'ArrowUp' })

    expect(sheet).toHaveStyle({ transform: 'translateY(-282px)' })
  })

  it('keeps only the configured handle height visible when collapsed', () => {
    const { container } = render(
      <main className="journey-page">
        <DraggableSheet collapsedHeight={28}>시트 내용</DraggableSheet>
      </main>,
    )
    const viewport = container.querySelector('main') as HTMLElement
    const sheet = screen.getByText('시트 내용').closest('section') as HTMLElement
    const handle = screen.getByRole('button', { name: '패널 높이 조절' })
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 800 },
      getBoundingClientRect: { configurable: true, value: () => ({ top: 0 }) },
    })
    Object.defineProperty(sheet, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        const offset = Number(sheet.style.transform.match(/-?\d+/)?.[0] ?? 0)
        return { top: 500 + offset }
      },
    })

    for (let index = 0; index < 10; index += 1) fireEvent.keyDown(handle, { key: 'ArrowDown' })

    expect(sheet).toHaveStyle({ transform: 'translateY(272px)' })
  })
})
