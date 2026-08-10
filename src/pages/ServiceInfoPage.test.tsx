import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServiceInfoPage } from './ServiceInfoPage'

describe('ServiceInfoPage', () => {
  it('shows brand and service information actions', () => {
    const onOpen = vi.fn()
    render(<ServiceInfoPage onOpen={onOpen} />)

    expect(screen.getByRole('img', { name: '멍루트' })).toHaveAttribute('src', '/assets/i01/logo-horizontal.png')
    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '이용약관' }))
    expect(onOpen).toHaveBeenCalledWith('terms')
  })
})
