import axios from 'axios'
import { createGiteaAdminClient, giteaErrorMessage } from './giteaUtils'

jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  return { ...actual, create: jest.fn(), isAxiosError: actual.isAxiosError }
})

const mockApi = { get: jest.fn(), delete: jest.fn() }

describe('giteaUtils', () => {
  beforeEach(() => {
    ;(axios.create as jest.Mock).mockReturnValue(mockApi)
    mockApi.get.mockReset()
    mockApi.delete.mockReset()
  })

  it('authenticates with the admin credentials against the internal Gitea service', () => {
    createGiteaAdminClient('otomi-admin', 'secret')

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://gitea-http.gitea.svc.cluster.local:3000/api/v1',
        auth: { username: 'otomi-admin', password: 'secret' },
      }),
    )
  })

  it('lists users across all pages', async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => ({ login: `user${i}`, email: `user${i}@example.com` }))
    mockApi.get
      .mockResolvedValueOnce({ data: page1 })
      .mockResolvedValueOnce({ data: [{ login: 'last', email: 'l@x' }] })

    const users = await createGiteaAdminClient('u', 'p').listUsers()

    expect(users).toHaveLength(51)
    expect(users[50]).toEqual({ username: 'last', email: 'l@x' })
    expect(mockApi.get).toHaveBeenNthCalledWith(1, '/admin/users', { params: { page: 1, limit: 50 } })
    expect(mockApi.get).toHaveBeenNthCalledWith(2, '/admin/users', { params: { page: 2, limit: 50 } })
  })

  it('lists only repositories the user owns', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: [
        { full_name: 'alice/notes', owner: { login: 'alice' } },
        { full_name: 'team-blue/app', owner: { login: 'team-blue' } },
      ],
    })

    expect(await createGiteaAdminClient('u', 'p').listUserRepos('alice')).toEqual(['alice/notes'])
    expect(mockApi.get).toHaveBeenCalledWith('/users/alice/repos', { params: { page: 1, limit: 50 } })
  })

  it('deletes a user with purge so their personal repositories go too', async () => {
    mockApi.delete.mockResolvedValue({})

    await createGiteaAdminClient('u', 'p').deleteUser('alice')

    expect(mockApi.delete).toHaveBeenCalledWith('/admin/users/alice', { params: { purge: true } })
  })

  it('prefers the Gitea API error message', () => {
    const err = new axios.AxiosError('Request failed with status code 422')
    err.response = { data: { message: 'user is last owner of org' } } as any

    expect(giteaErrorMessage(err)).toBe('user is last owner of org')
    expect(giteaErrorMessage(new Error('boom'))).toBe('boom')
  })
})
