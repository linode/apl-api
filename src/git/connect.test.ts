import { getAuthenticatedUrl } from './connect'

describe('getAuthenticatedUrl', () => {
  it('uses a placeholder username when only a PAT is given', () => {
    expect(getAuthenticatedUrl({ repoUrl: 'https://github.com/org/repo', password: 'my-token' })).toBe(
      'https://otomi-admin:my-token@github.com/org/repo',
    )
  })

  it('uses the given username and encodes credentials', () => {
    expect(getAuthenticatedUrl({ repoUrl: 'https://github.com/org/repo', username: 'bot@x', password: 'p@ss' })).toBe(
      'https://bot%40x:p%40ss@github.com/org/repo',
    )
  })

  it('leaves file urls untouched', () => {
    expect(getAuthenticatedUrl({ repoUrl: 'file:///tmp/repo', password: 'my-token' })).toBe('file:///tmp/repo')
  })
})
