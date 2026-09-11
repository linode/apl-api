import { Password } from 'src/generated/dex/api'
import { deriveDexGroups, dexPasswordToUser } from './userUtils'

function password(overrides: Partial<Password> = {}): Password {
  return {
    email: 'a@b.com',
    hash: Buffer.from('hash'),
    username: 'a',
    userId: 'uuid-1',
    groups: [],
    ...overrides,
  }
}

describe('deriveDexGroups', () => {
  it('returns no groups for a plain team member with no teams', () => {
    expect(deriveDexGroups({ isPlatformAdmin: false, isTeamAdmin: false, teams: [] })).toEqual([])
  })

  it('adds platform-admin for a platform admin', () => {
    expect(deriveDexGroups({ isPlatformAdmin: true, isTeamAdmin: false, teams: [] })).toEqual(['platform-admin'])
  })

  it('adds team-admin for a team admin', () => {
    expect(deriveDexGroups({ isPlatformAdmin: false, isTeamAdmin: true, teams: [] })).toEqual(['team-admin'])
  })

  it('adds team-<id> for each team, matching the jwt.ts naming convention', () => {
    expect(deriveDexGroups({ isPlatformAdmin: false, isTeamAdmin: false, teams: ['blue', 'red'] })).toEqual([
      'team-blue',
      'team-red',
    ])
  })

  it('combines all group types', () => {
    expect(deriveDexGroups({ isPlatformAdmin: true, isTeamAdmin: true, teams: ['blue'] })).toEqual([
      'platform-admin',
      'team-admin',
      'team-blue',
    ])
  })
})

describe('dexPasswordToUser', () => {
  it('maps a plain member with no groups', () => {
    expect(dexPasswordToUser(password({ userId: 'u1', email: 'a@b.com', groups: [] }))).toMatchObject({
      id: 'u1',
      email: 'a@b.com',
      isPlatformAdmin: false,
      isTeamAdmin: false,
      teams: [],
    })
  })

  it('maps platform-admin and team-admin groups to their flags', () => {
    expect(dexPasswordToUser(password({ groups: ['platform-admin', 'team-admin'] }))).toMatchObject({
      isPlatformAdmin: true,
      isTeamAdmin: true,
      teams: [],
    })
  })

  it('extracts team ids from team-<id> groups, excluding the team-admin group itself', () => {
    expect(dexPasswordToUser(password({ groups: ['team-admin', 'team-blue', 'team-red'] }))).toMatchObject({
      isTeamAdmin: true,
      teams: ['blue', 'red'],
    })
  })

  it('strips the no-groups sentinel and treats it as no groups at all', () => {
    expect(dexPasswordToUser(password({ groups: ['__no_groups__'] }))).toMatchObject({
      isPlatformAdmin: false,
      isTeamAdmin: false,
      teams: [],
    })
  })

  it('round-trips through deriveDexGroups', () => {
    const original = { isPlatformAdmin: true, isTeamAdmin: false, teams: ['blue', 'red'] }
    const roundTripped = dexPasswordToUser(password({ groups: deriveDexGroups(original) }))
    expect(roundTripped).toMatchObject(original)
  })
})
