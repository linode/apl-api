import { expect } from 'chai'
import { JWT } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
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
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
  })
  it('A user in either platform-admin or all-teams-admin group should get platformAdmin role and have isPlatformAdmin', () => {
    const user = getUser(platformAdminJWT, otomiStack)
    expect(user.isPlatformAdmin).to.be.true
  })
  it('A user in team-admin group should get teamAdmin role and have isTeamAdmin', () => {
    const user = getUser(teamAdminJWT, otomiStack)
    expect(user.isTeamAdmin).to.be.true
  })
  it('A user in team-member group should get teamMember role and not have either isPlatformAdmin or isTeamAdmin', () => {
    const user = getUser(teamMemberJWT, otomiStack)
    expect(user.isPlatformAdmin).to.be.false
    expect(user.isTeamAdmin).to.be.false
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
