import { mockDeep } from 'jest-mock-extended'
import { JWT } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { loadSpec } from '../app'
import { Git } from '../git'
import * as getValuesSchemaModule from '../utils'
import { getUser } from './jwt'

const email = 'test@user.net'
const platformAdminGroups = ['platform-admin', 'all-teams-admin']
const teamAdminGroups = ['team-admin']
const teamMemberGroups = ['team-member']
const multiTeamGroups = ['team-team1', 'team-team2']
const multiTeamUser = ['team1', 'team2']
const platformAdminJWT: JWT = {
  name: 'joe',
  email,
  groups: platformAdminGroups,
  sub: 'mock-sub-value',
}
const teamAdminJWT: JWT = { ...platformAdminJWT, groups: teamAdminGroups }
const teamMemberJWT: JWT = { ...platformAdminJWT, groups: teamMemberGroups }
const multiTeamJWT: JWT = { ...platformAdminJWT, groups: multiTeamGroups }

describe('JWT claims mapping', () => {
  let otomiStack: OtomiStack

  beforeAll(async () => {
    jest.spyOn(getValuesSchemaModule, 'getValuesSchema').mockResolvedValue({})

    await loadSpec()
  })

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    otomiStack.git = mockDeep<Git>()
    otomiStack.doDeployment = jest.fn().mockImplementation(() => Promise.resolve())
    await otomiStack.init()
    await otomiStack.loadValues()
  })

  test('A user in either platform-admin or all-teams-admin group should get platformAdmin role and have isPlatformAdmin', () => {
    const user = getUser(platformAdminJWT, otomiStack)
    expect(user.isPlatformAdmin).toBeTruthy()
  })

  test('A user in team-admin group should get teamAdmin role and have isTeamAdmin', () => {
    const user = getUser(teamAdminJWT, otomiStack)
    expect(user.isTeamAdmin).toBeTruthy()
  })

  test('A user in team-member group should get teamMember role and not have either isPlatformAdmin or isTeamAdmin', () => {
    const user = getUser(teamMemberJWT, otomiStack)
    expect(user.isPlatformAdmin).toBeFalsy()
    expect(user.isTeamAdmin).toBeFalsy()
  })

  test('Multiple team groups should result in the same amount of teams existing', async () => {
    await Promise.all(multiTeamUser.map(async (teamId) => otomiStack.createTeam({ name: teamId })))
    const user = getUser(multiTeamJWT, otomiStack)
    expect(user.teams).toEqual(multiTeamUser)
    expect(user.isPlatformAdmin).toBeFalsy()
  })

  test("Non existing team groups should not be added to the user's list of teams", async () => {
    const extraneousTeamsList = [...multiTeamUser, 'nonexist']
    await Promise.all(extraneousTeamsList.map(async (teamId) => otomiStack.createTeam({ name: teamId })))
    const user = getUser(multiTeamJWT, otomiStack)
    expect(user.teams).toEqual(multiTeamUser)
    expect(user.isPlatformAdmin).toBeFalsy()
  })
})
