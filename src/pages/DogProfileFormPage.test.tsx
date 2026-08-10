import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DogProfileFormPage } from './DogProfileFormPage'

describe('DogProfileFormPage', () => {
  it('edits the dog profile and saves the current values', () => {
    const onSave = vi.fn()
    render(<DogProfileFormPage onSave={onSave} />)

    expect(screen.getByRole('img', { name: '망고 프로필 사진' })).toHaveAttribute('src', '/assets/p02/dog-profile.png')
    expect(screen.getByRole('button', { name: '2022. 05. 12' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '망고2' } })
    fireEvent.change(screen.getByLabelText('생년월일 선택'), { target: { value: '2022-06-13' } })
    fireEvent.click(screen.getByRole('switch', { name: '기본 산책 친구' }))
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

    expect(onSave).toHaveBeenCalledWith({ name: '망고2', breed: '골든 리트리버', birthDate: '2022-06-13', isDefault: false, profileImageSrc: '/assets/p02/dog-profile.png' })
  })

  it('does not save an empty dog name', () => {
    const onSave = vi.fn()
    render(<DogProfileFormPage onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
