import { AUTHZ_MOCK_IS_PLATFORM_ADMIN, AUTHZ_MOCK_IS_TEAM_ADMIN, AUTHZ_MOCK_TEAM, cleanEnv } from 'src/validators'

const env = cleanEnv({
  AUTHZ_MOCK_IS_PLATFORM_ADMIN,
  AUTHZ_MOCK_IS_TEAM_ADMIN,
  AUTHZ_MOCK_TEAM,
})

const platformAdminEmails = ['bob@platform.admin', 'joe@platform.admin']
const teamAdminEmails = ['tom@team.admin', 'eli@team.admin']
const teamMemberEmails = ['alec@team.member', 'frank@team.member']
const platformAdminNames = ['Bob Plaftorm Admin', 'Joe Platform Admin']
const teamAdminNames = ['Tom Team Admin', 'Eli Team Admin']
const teamMemberNames = ['Alec Team Member', 'Frank Team Member']

let mockIdx = 0
export const setMockIdx = (idx) => {
  mockIdx = idx
}
export const getMockEmail = () => {
  if (env.AUTHZ_MOCK_IS_PLATFORM_ADMIN) {
    return platformAdminEmails[mockIdx]
  } else if (env.AUTHZ_MOCK_IS_TEAM_ADMIN) {
    return teamAdminEmails[mockIdx]
  } else {
    return teamMemberEmails[mockIdx]
  }
}

export const getMockName = () => {
  if (env.AUTHZ_MOCK_IS_PLATFORM_ADMIN) {
    return platformAdminNames[mockIdx]
  } else if (env.AUTHZ_MOCK_IS_TEAM_ADMIN) {
    return teamAdminNames[mockIdx]
  } else {
    return teamMemberNames[mockIdx]
  }
}

export const getMockGroups = () => {
  const groups: Array<string> = []
  if (env.AUTHZ_MOCK_IS_PLATFORM_ADMIN) groups.push('platform-admin')
  if (env.AUTHZ_MOCK_IS_TEAM_ADMIN) groups.push('team-admin')
  if (env.AUTHZ_MOCK_TEAM) {
    env.AUTHZ_MOCK_TEAM.split(',').forEach((team) => {
      groups.push(`team-${team}`)
    })
  }
  return groups
}
