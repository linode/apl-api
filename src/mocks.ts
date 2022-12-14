import { AUTHZ_MOCK_IS_ADMIN, AUTHZ_MOCK_TEAM, cleanEnv } from 'src/validators'

const env = cleanEnv({
  AUTHZ_MOCK_IS_ADMIN,
  AUTHZ_MOCK_TEAM,
})

const adminEmails = ['bob.admin@otomi.cloud', 'joe.admin@otomi.cloud']
const teamEmails = ['alec.team@otomi.cloud', 'frank.team@otomi.cloud']
const adminNames = ['Bob Admin', 'Joe Admin']
const teamNames = ['Alec Team', 'Frank Team']

let mockIdx = 0
export const setMockIdx = (idx) => {
  mockIdx = idx
}
export const getMockEmail = () => (env.AUTHZ_MOCK_IS_ADMIN ? adminEmails[mockIdx] : teamEmails[mockIdx])
export const getMockName = () => (env.AUTHZ_MOCK_IS_ADMIN ? adminNames[mockIdx] : teamNames[mockIdx])
export const getMockGroups = () => {
  const groups: Array<string> = []
  if (env.AUTHZ_MOCK_IS_ADMIN) groups.push('team-admin')
  if (env.AUTHZ_MOCK_TEAM) {
    env.AUTHZ_MOCK_TEAM.split(',').forEach((team) => {
      groups.push(`team-${team}`)
    })
  }
  return groups
}
