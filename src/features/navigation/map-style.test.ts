import { describe, expect, it } from 'vitest'
import { resolveMapStyleUrl } from './map-style'

describe('resolveMapStyleUrl', () => {
  it('adds a separately configured MapTiler key to its style URL', () => {
    expect(resolveMapStyleUrl('https://api.maptiler.com/maps/streets-v4/style.json', 'test-key'))
      .toBe('https://api.maptiler.com/maps/streets-v4/style.json?key=test-key')
  })

  it('does not overwrite an existing key or append one to another provider', () => {
    expect(resolveMapStyleUrl('https://api.maptiler.com/maps/basic/style.json?key=url-key', 'env-key'))
      .toBe('https://api.maptiler.com/maps/basic/style.json?key=url-key')
    expect(resolveMapStyleUrl('https://maps.example.test/style.json', 'env-key'))
      .toBe('https://maps.example.test/style.json')
  })
})
