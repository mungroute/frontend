import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { JoinGroupPage } from './JoinGroupPage'

describe('JoinGroupPage', () => {
  it('normalizes a six-character invitation code and confirms it', () => {
    const onConfirm = vi.fn()
    render(<JoinGroupPage defaultCode="" onConfirm={onConfirm} />)

    const input = screen.getByLabelText('초대 코드')
    fireEvent.change(input, { target: { value: 'mung-24' } })
    expect(input).toHaveValue('MUNG24')
    fireEvent.click(screen.getByRole('button', { name: '그룹 확인하기' }))

    expect(onConfirm).toHaveBeenCalledWith('MUNG24')
  })

  it('extracts the invitation code from a pasted link', () => {
    render(<JoinGroupPage defaultCode="" />)

    const input = screen.getByLabelText('초대 코드')
    fireEvent.change(input, { target: { value: 'https://mungroute.example/groups/invite?code=MUNG24' } })
    expect(input).toHaveValue('MUNG24')
  })

  it('accepts Korean characters and uppercases English letters', () => {
    render(<JoinGroupPage defaultCode="" />)

    const input = screen.getByLabelText('초대 코드')
    fireEvent.change(input, { target: { value: '멍루트ab' } })

    expect(input).toHaveValue('멍루트AB')
  })
})
