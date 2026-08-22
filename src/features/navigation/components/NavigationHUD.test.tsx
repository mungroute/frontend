import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavigationHUD } from './NavigationHUD'

describe('NavigationHUD', () => {
  it('shows the complete turn instruction for narrow mobile layouts', () => {
    render(<NavigationHUD
      maneuver={{ id: 'turn-1', kind: 'SLIGHT_RIGHT', distanceM: 108 }}
      routeName="대표 코스길"
    />)

    expect(screen.getByText('110m 뒤 완만한 우회전')).toBeInTheDocument()
    expect(screen.getByText('대표 코스길')).toBeInTheDocument()
  })
})
