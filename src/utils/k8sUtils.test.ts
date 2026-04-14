import { isK8sVersionAtLeast, isKnativeSupported } from './k8sUtils'

describe('isK8sVersionAtLeast', () => {
  it('returns true when version meets the minimum', () => {
    expect(isK8sVersionAtLeast('v1.33.0', '1.33.0')).toBe(true)
  })

  it('returns true when version exceeds the minimum', () => {
    expect(isK8sVersionAtLeast('v1.35.3', '1.33.0')).toBe(true)
  })

  it('returns false when version is below the minimum', () => {
    expect(isK8sVersionAtLeast('v1.32.9', '1.33.0')).toBe(false)
  })

  it('handles versions without the v prefix', () => {
    expect(isK8sVersionAtLeast('1.33.0', '1.33.0')).toBe(true)
  })

  it('returns false for unparseable version strings', () => {
    expect(isK8sVersionAtLeast('x.x.x', '1.33.0')).toBe(false)
  })
})

describe('isKnativeSupported', () => {
  it('returns true for Kubernetes 1.33', () => {
    expect(isKnativeSupported('v1.33.0')).toBe(true)
  })

  it('returns true for Kubernetes above 1.33', () => {
    expect(isKnativeSupported('v1.35.3')).toBe(true)
  })

  it('returns false for Kubernetes below 1.33', () => {
    expect(isKnativeSupported('v1.32.0')).toBe(false)
  })
})
