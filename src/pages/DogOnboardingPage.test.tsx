import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DogOnboardingPage } from './DogOnboardingPage'

describe('DogOnboardingPage', () => {
  it('collects a dog profile and selected temperament tags after signup', () => {
    const onSave = vi.fn()
    render(<DogOnboardingPage onSave={onSave} onSkip={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '망고' } })
    fireEvent.change(screen.getByLabelText('견종'), { target: { value: '골든 리트리버' } })
    fireEvent.click(screen.getByRole('button', { name: '남아' }))
    fireEvent.click(screen.getByRole('button', { name: '했어요' }))
    fireEvent.change(screen.getByLabelText('출생 연도'), { target: { value: '2022' } })
    fireEvent.change(screen.getByLabelText('출생 월'), { target: { value: '05' } })
    fireEvent.change(screen.getByLabelText('출생 일'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: '#예민해요' }))
    fireEvent.click(screen.getByRole('button', { name: '#물어요' }))
    fireEvent.click(within(screen.getByRole('group', { name: /목줄 인사/ })).getByRole('button', { name: '좋아해요' }))
    fireEvent.click(within(screen.getByRole('group', { name: /낯선 사람/ })).getByRole('button', { name: '보통이에요' }))
    fireEvent.click(within(screen.getByRole('group', { name: /스킨십/ })).getByRole('button', { name: '가능해요' }))
    fireEvent.click(within(screen.getByRole('group', { name: /짖음 정도/ })).getByRole('button', { name: '거의 안 짖어요' }))
    fireEvent.click(within(screen.getByRole('group', { name: /입질 반응/ })).getByRole('button', { name: '없어요' }))
    fireEvent.change(screen.getByLabelText('강아지 한 줄 소개'), { target: { value: '천천히 다가오면 친해져요.' } })
    fireEvent.click(screen.getByRole('button', { name: '반려견 등록하고 시작하기' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: '망고',
      breed: '골든 리트리버',
      birthDate: '2022-05-12',
      gender: 'MALE',
      neutered: true,
      introduction: '천천히 다가오면 친해져요.',
      isDefault: true,
      temperamentTags: ['예민해요', '물어요'],
    }))
  })

  it('allows dog registration to be skipped', () => {
    const onSkip = vi.fn()
    render(<DogOnboardingPage onSave={vi.fn()} onSkip={onSkip} />)

    fireEvent.click(screen.getByRole('button', { name: '나중에 등록할게요' }))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
