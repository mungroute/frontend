import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteGeneratingPage } from './RouteGeneratingPage'

describe('RouteGeneratingPage', () => {
  it('shows route-search progress and three loading cards', () => {
    render(<RouteGeneratingPage duration={30} />)

    expect(screen.getByRole('heading', { name: '30분에 맞는 길을 찾고 있어요' })).toBeInTheDocument()
    expect(screen.getByText('그늘과 노면 온도를 함께 살펴보는 중이에요')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '코스를 찾는 중인 강아지' })).toBeInTheDocument()
    expect(screen.getAllByTestId('route-card-skeleton')).toHaveLength(3)
  })
})
