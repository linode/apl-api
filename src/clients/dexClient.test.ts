const mockCreatePassword = jest.fn()
const mockUpdatePassword = jest.fn()
const mockDeletePassword = jest.fn()

jest.mock('src/generated/dex/api', () => ({
  DexClient: jest.fn().mockImplementation(() => ({
    createPassword: mockCreatePassword,
    updatePassword: mockUpdatePassword,
    deletePassword: mockDeletePassword,
  })),
}))

process.env.DEX_GRPC_ADDRESS = 'localhost:5557'

import {
  createDexPassword,
  DEX_NO_GROUPS_SENTINEL,
  deleteDexPassword,
  DexProvisionError,
  updateDexPassword,
} from './dexClient'

describe('dexClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('createDexPassword sends email, hash, username, user_id and groups', async () => {
    mockCreatePassword.mockImplementation((_req, cb) => cb(null, { alreadyExists: false }))

    await createDexPassword({
      id: 'uuid-1',
      email: 'a@b.com',
      passwordHash: '$2a$10$hash',
      username: 'a',
      groups: ['platform-admin'],
    })

    expect(mockCreatePassword).toHaveBeenCalledWith(
      {
        password: {
          email: 'a@b.com',
          hash: Buffer.from('$2a$10$hash', 'utf-8'),
          username: 'a',
          userId: 'uuid-1',
          groups: ['platform-admin'],
        },
      },
      expect.any(Function),
    )
  })

  it('createDexPassword sends the no-groups sentinel instead of an empty array', async () => {
    mockCreatePassword.mockImplementation((_req, cb) => cb(null, { alreadyExists: false }))

    await createDexPassword({ id: 'uuid-1', email: 'a@b.com', passwordHash: 'h', username: 'a', groups: [] })

    expect(mockCreatePassword).toHaveBeenCalledWith(
      expect.objectContaining({ password: expect.objectContaining({ groups: [DEX_NO_GROUPS_SENTINEL] }) }),
      expect.any(Function),
    )
  })

  it('createDexPassword rejects with DexProvisionError on RPC error', async () => {
    mockCreatePassword.mockImplementation((_req, cb) => cb(new Error('unavailable'), null))

    await expect(
      createDexPassword({ id: 'uuid-1', email: 'a@b.com', passwordHash: 'h', username: 'a', groups: [] }),
    ).rejects.toBeInstanceOf(DexProvisionError)
  })

  it('createDexPassword rejects with DexProvisionError when Dex reports alreadyExists', async () => {
    mockCreatePassword.mockImplementation((_req, cb) => cb(null, { alreadyExists: true }))

    await expect(
      createDexPassword({ id: 'uuid-1', email: 'a@b.com', passwordHash: 'h', username: 'a', groups: [] }),
    ).rejects.toBeInstanceOf(DexProvisionError)
  })

  it('updateDexPassword only sets provided fields', async () => {
    mockUpdatePassword.mockImplementation((_req, cb) => cb(null, { notFound: false }))

    await updateDexPassword({ email: 'a@b.com', newGroups: ['team-blue'] })

    expect(mockUpdatePassword).toHaveBeenCalledWith(
      { email: 'a@b.com', newHash: Buffer.alloc(0), newUsername: '', newGroups: ['team-blue'] },
      expect.any(Function),
    )
  })

  it('updateDexPassword sends the no-groups sentinel when clearing groups to empty', async () => {
    mockUpdatePassword.mockImplementation((_req, cb) => cb(null, { notFound: false }))

    await updateDexPassword({ email: 'a@b.com', newGroups: [] })

    expect(mockUpdatePassword).toHaveBeenCalledWith(
      expect.objectContaining({ newGroups: [DEX_NO_GROUPS_SENTINEL] }),
      expect.any(Function),
    )
  })

  it('updateDexPassword leaves newGroups empty when groups are not being touched', async () => {
    mockUpdatePassword.mockImplementation((_req, cb) => cb(null, { notFound: false }))

    await updateDexPassword({ email: 'a@b.com', newUsername: 'a' })

    expect(mockUpdatePassword).toHaveBeenCalledWith(expect.objectContaining({ newGroups: [] }), expect.any(Function))
  })

  it('updateDexPassword rejects with DexProvisionError when the record is not found', async () => {
    mockUpdatePassword.mockImplementation((_req, cb) => cb(null, { notFound: true }))

    await expect(updateDexPassword({ email: 'ghost@b.com' })).rejects.toBeInstanceOf(DexProvisionError)
  })

  it('deleteDexPassword resolves even when Dex reports not found (idempotent)', async () => {
    mockDeletePassword.mockImplementation((_req, cb) => cb(null, { notFound: true }))

    await expect(deleteDexPassword('a@b.com')).resolves.toBeUndefined()
    expect(mockDeletePassword).toHaveBeenCalledWith({ email: 'a@b.com' }, expect.any(Function))
  })

  it('deleteDexPassword rejects with DexProvisionError on RPC error', async () => {
    mockDeletePassword.mockImplementation((_req, cb) => cb(new Error('unavailable'), null))

    await expect(deleteDexPassword('a@b.com')).rejects.toBeInstanceOf(DexProvisionError)
  })
})
