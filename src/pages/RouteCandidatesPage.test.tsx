import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getCourseCandidates } from '../Components/courses/course-data'
import { RouteCandidatesPage } from './RouteCandidatesPage'

describe('RouteCandidatesPage', () => {
  it('shows saved and newly generated routes and selects the matching representative by default', () => {
    render(<RouteCandidatesPage />)

    expect(screen.getByRole('heading', { name: '30분 안에 걸을 수 있는 코스예요' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '내 코스' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '새 추천 코스' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /저녁 남산길/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /남산 둘레길 A/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('선택한 30분보다 약 12분 길어요')).toBeInTheDocument()
  })

  it('hides the saved section and defaults to the first recommendation when no courses are saved', () => {
    const generatedOnly = getCourseCandidates(30, { includeSaved: false })
    render(<RouteCandidatesPage candidates={generatedOnly} />)

    expect(screen.queryByRole('region', { name: '내 코스' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /남산 둘레길 A/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('changes the map, CTA, and confirmed candidate with the selected route', () => {
    const onConfirm = vi.fn()
    render(<RouteCandidatesPage onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: /장충단 공원길 B/ }))
    expect(screen.getByRole('region', { name: '장충단 공원길 B 경로 지도' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '추천 코스로 산책 시작' }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: 'generated-jangchung-park-b', source: 'generated' }))

    fireEvent.click(screen.getByRole('button', { name: /한강 노을 산책/ }))
    fireEvent.click(screen.getByRole('button', { name: '그래도 이 코스로 걷기' }))
    expect(onConfirm).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'saved-hangang-sunset', withinTargetTime: false }))
  })

  it('marks every surface temperature as estimated', () => {
    render(<RouteCandidatesPage />)
    const cards = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'))
    cards.forEach((card) => expect(within(card).getByText(/추정 노면 \d+℃/)).toBeInTheDocument())
  })
})
