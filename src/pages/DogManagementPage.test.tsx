import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DogManagementPage } from './DogManagementPage'

describe('DogManagementPage', () => {
  it('lists registered dogs and exposes edit and registration actions', () => {
    const onEditDog = vi.fn()
    const onRegisterDog = vi.fn()
    render(<DogManagementPage onEditDog={onEditDog} onRegisterDog={onRegisterDog} />)

    expect(screen.getByRole('heading', { name: '반려견 관리' })).toBeInTheDocument()
    expect(screen.getByText('망고')).toBeInTheDocument()
    expect(screen.getByText('쿠키')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '망고 편집' }))
    fireEvent.click(screen.getByRole('button', { name: '반려견 등록하기' }))
    expect(onEditDog).toHaveBeenCalledWith('mango')
    expect(onRegisterDog).toHaveBeenCalledOnce()
  })
})
