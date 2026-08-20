import { afterEach, describe, expect, it } from 'vitest'
import {
  DEV_TEST_ACCOUNT_LOCATIONS,
  getDevLocationOverride,
  setDevLocationOverrideUser,
} from './devLocationOverride'

describe('development account location overrides', () => {
  afterEach(() => setDevLocationOverrideUser(undefined))

  it('maps the two local test accounts to distinct Jung-gu coordinates', () => {
    setDevLocationOverrideUser(' TEST@NAVER.COM ')
    expect(getDevLocationOverride()).toEqual(DEV_TEST_ACCOUNT_LOCATIONS['test@naver.com'])

    setDevLocationOverrideUser('test2@naver.com')
    expect(getDevLocationOverride()).toEqual(DEV_TEST_ACCOUNT_LOCATIONS['test2@naver.com'])

    const first = DEV_TEST_ACCOUNT_LOCATIONS['test@naver.com']
    const second = DEV_TEST_ACCOUNT_LOCATIONS['test2@naver.com']
    expect(first).not.toEqual(second)
    expect(Math.abs(first.latitude - second.latitude)).toBeLessThan(0.003)
    expect(Math.abs(first.longitude - second.longitude)).toBeLessThan(0.003)
  })

  it('does not override ordinary accounts', () => {
    setDevLocationOverrideUser('someone@example.com')
    expect(getDevLocationOverride()).toBeUndefined()
  })
})
