import { createDexPassword, deleteDexPassword, updateDexPassword } from './dexClient'

const describeIfDexAvailable = process.env.DEX_GRPC_ADDRESS ? describe : describe.skip

describeIfDexAvailable('dexClient integration (requires a running fork-built Dex)', () => {
  const email = `dex-integration-test-${Date.now()}@example.com`

  it('creates, updates groups, and deletes a password record end to end', async () => {
    await createDexPassword({
      id: 'integration-test-uuid',
      email,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuuVGm5ZQeXk6b2ZQeXk6b2ZQeXk6b',
      username: 'dex-integration-test',
      groups: ['team-blue'],
    })

    await updateDexPassword({ email, newGroups: ['team-blue', 'team-admin'] })

    await deleteDexPassword(email)
  })
})
