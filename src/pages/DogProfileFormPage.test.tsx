import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DogProfileFormPage } from './DogProfileFormPage'

describe('DogProfileFormPage', () => {
  it('edits the dog profile and saves the current values', () => {
    const onSave = vi.fn()
    render(<DogProfileFormPage onSave={onSave} />)

    expect(screen.getByRole('img', { name: '망고 프로필 사진' })).toHaveAttribute('src', '/assets/shared/dog-profile-default.svg')
    expect(screen.queryByRole('button', { name: '기본 프로필로 변경' })).not.toBeInTheDocument()
    expect(screen.getByText('사진은 저장하기를 눌러야 프로필에 반영돼요.')).toBeInTheDocument()
    expect(screen.getByLabelText('출생 연도')).toHaveValue('2022')
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '망고2' } })
    fireEvent.change(screen.getByLabelText('출생 월'), { target: { value: '06' } })
    fireEvent.change(screen.getByLabelText('출생 일'), { target: { value: '13' } })
    fireEvent.click(screen.getByRole('switch', { name: '기본 산책 친구' }))
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }))

    expect(onSave).toHaveBeenCalledWith({
      name: '망고2', breed: '골든 리트리버', birthDate: '2022-06-13', gender: 'MALE', neutered: true,
      introduction: '', isDefault: false, profileImageSrc: '/assets/shared/dog-profile-default.svg', temperamentTags: [],
      leashGreeting: 'NEUTRAL', strangerResponse: 'NEUTRAL', touchTolerance: 'CONDITIONAL', barkingLevel: 'NORMAL', bitingLevel: 'NONE',
    })
  })

  it('offers and applies the default profile image only for a custom photo', () => {
    render(<DogProfileFormPage initialDog={{
      name: '콩이', breed: '포메라니안', birthDate: '2022-05-12', gender: 'FEMALE', neutered: true,
      introduction: '', isDefault: true, profileImageSrc: 'data:image/jpeg;base64,custom', temperamentTags: [],
      leashGreeting: 'NEUTRAL', strangerResponse: 'NEUTRAL', touchTolerance: 'CONDITIONAL', barkingLevel: 'NORMAL', bitingLevel: 'NONE',
    }} />)

    fireEvent.click(screen.getByRole('button', { name: '기본 프로필로 변경' }))

    expect(screen.getByRole('img', { name: '콩이 프로필 사진' })).toHaveAttribute('src', '/assets/shared/dog-profile-default.svg')
    expect(screen.queryByRole('button', { name: '기본 프로필로 변경' })).not.toBeInTheDocument()
    expect(screen.getByText('새 사진이 선택됐어요. 저장하기를 눌러야 반영돼요.')).toBeInTheDocument()
  })

  it('does not save an empty dog name', () => {
    const onSave = vi.fn()
    render(<DogProfileFormPage onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
