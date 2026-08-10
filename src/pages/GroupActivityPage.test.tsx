import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GroupActivityPage } from './GroupActivityPage'

describe('GroupActivityPage', () => {
  it('shows the group activity feed in newest-first order', () => {
    render(<GroupActivityPage />)

    expect(screen.getByRole('heading', { name: '그룹 활동' })).toBeInTheDocument()
    expect(screen.getByText('남산 댕댕이 산책단')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent('민지')
    expect(items[0]).toHaveTextContent('새 코스를 공유했어요')
    expect(items[3]).toHaveTextContent('한강 노을 산책을 저장했어요')
  })
})
