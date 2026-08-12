import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupListPage } from './GroupListPage'

describe('GroupListPage', () => {
  it('opens group creation and a selected group', () => {
    const onCreateGroup = vi.fn()
    const onOpenGroup = vi.fn()
    render(<GroupListPage onCreateGroup={onCreateGroup} onOpenGroup={onOpenGroup} />)

    expect(screen.getByRole('heading', { name: '그룹' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '그룹' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))
    fireEvent.click(screen.getByRole('button', { name: /남산 댕댕이 산책단/ }))
    expect(onCreateGroup).toHaveBeenCalledOnce()
    expect(onOpenGroup).toHaveBeenCalledWith('namsan-dogs')
  })
})
