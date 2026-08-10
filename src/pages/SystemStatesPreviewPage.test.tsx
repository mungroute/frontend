import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SystemStatesPreviewPage } from './SystemStatesPreviewPage'

describe('SystemStatesPreviewPage', () => {
  it('lists every modal and system state from the Figma section', () => {
    render(<SystemStatesPreviewPage onSelect={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '모달 · 시스템 상태' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /미리보기/ })).toHaveLength(12)
  })

  it('opens a selected preview and returns to the catalog', () => {
    const onSelect = vi.fn()
    render(<SystemStatesPreviewPage selectedCase="m05" onSelect={onSelect} />)

    expect(screen.getByRole('dialog', { name: '산책 종료 확인' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '미리보기 목록' }))
    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('opens course rename and returns from course sharing inside the more preview', () => {
    render(<SystemStatesPreviewPage selectedCase="m06" onSelect={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '코스 이름 변경' }))
    expect(screen.getByRole('dialog', { name: '코스 이름 변경' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    fireEvent.click(screen.getByRole('button', { name: '그룹에 코스 공유' }))
    expect(screen.getByRole('dialog', { name: '코스 공유' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(screen.getByRole('dialog', { name: '기록 더보기' })).toBeInTheDocument()
  })

  it.each([
    ['o01', '다시 시도'],
    ['st03', '35분으로 다시 찾기'],
  ] as const)('returns from the %s recovery action', (selectedCase, action) => {
    const onSelect = vi.fn()
    render(<SystemStatesPreviewPage selectedCase={selectedCase} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: action }))

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })
})
