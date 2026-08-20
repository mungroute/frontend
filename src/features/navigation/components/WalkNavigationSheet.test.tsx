import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalkNavigationSheet } from './WalkNavigationSheet'

describe('WalkNavigationSheet', () => {
  it('starts collapsed with pause available and supports keyboard snap states', () => {
    const onPause = vi.fn()
    render(
      <WalkNavigationSheet time="00:03:00" distance="0.2km" modeSummary="일반 산책" onPause={onPause}>
        <button type="button">상세 제어</button>
      </WalkNavigationSheet>,
    )

    const handle = screen.getByRole('button', { name: '산책 패널 펼치기' })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    expect(onPause).toHaveBeenCalledOnce()

    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(screen.getByRole('button', { name: '산책 패널 접기' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: '상세 제어' }).parentElement).toHaveAttribute('aria-hidden', 'false')

    fireEvent.keyDown(screen.getByRole('button', { name: '산책 패널 접기' }), { key: 'ArrowDown' })
    expect(screen.getByRole('button', { name: '산책 패널 펼치기' })).toHaveAttribute('aria-expanded', 'false')
  })
})
