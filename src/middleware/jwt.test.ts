import { expect } from 'chai'
import { JWT } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { getUser } from './jwt'

const email = 'test@user.net'
const platformAdminGroups = ['platform-admin', 'all-teams-admin']
const multiTeamGroups = ['team-team1', 'team-team2']
const multiTeamUser = ['team1', 'team2']
const platformAdminJWT: JWT = {
  name: 'joe',
  email,
  groups: platformAdminGroups,
  sub: 'mock-sub-value',
}
const multiTeamJWT: JWT = { ...platformAdminJWT, groups: multiTeamGroups }

describe('JWT claims mapping', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
  })
  it('A user in either admin or team-admin group should get admin role and have isAdmin', () => {
    const user = getUser(platformAdminJWT, otomiStack)
    expect(user.isPlatformAdmin).to.be.true
  })
  it('Multiple team groups should result in the same amount of teams existing', async () => {
    await Promise.all(multiTeamUser.map((teamId) => otomiStack.createTeam({ name: teamId })))
    const user = getUser(multiTeamJWT, otomiStack)
    expect(user.teams).to.deep.equal(multiTeamUser)
    expect(user.isPlatformAdmin).to.be.false
  })
  it("Non existing team groups should not be added to the user's list of teams", async () => {
    const extraneousTeamsList = [...multiTeamUser, 'nonexisting']
    await Promise.all(extraneousTeamsList.map((teamId) => otomiStack.createTeam({ name: teamId })))
    const user = getUser(multiTeamJWT, otomiStack)
    expect(user.teams).to.deep.equal(multiTeamUser)
    expect(user.isPlatformAdmin).to.be.false
  })
})
