import { expect } from 'chai'
import { getUser } from './middleware'
import { JWT } from './otomi-models'
import OtomiStack, { loadOpenApisSpec } from './otomi-stack'

const email = 'test@user.net'
const adminGroups = ['team-admin', 'admin']
const multiTeamGroups = ['team-team1', 'team-team2']
const multiTeamUser = ['team1', 'team2']
const adminJWT: JWT = {
  name: 'joe',
  email,
  groups: adminGroups,
}
const multiTeamJWT: JWT = { ...adminJWT, groups: multiTeamGroups }

describe('JWT claims mapping', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    const [spec] = await loadOpenApisSpec()
    otomiStack.setSpec(spec as any)
  })
  it('A user in either admin or team-admin group should get admin role and have isAdmin', () => {
    const user = getUser(adminJWT, otomiStack)
    expect(user.isAdmin).to.be.true
  })
  it('Multiple team groups should result in the same amount of teams existing', () => {
    multiTeamUser.forEach((teamId) => otomiStack.createTeam({ name: teamId }))
    const user = getUser(multiTeamJWT, otomiStack)
    expect(user.teams).to.deep.equal(multiTeamUser)
    expect(user.isAdmin).to.be.false
  })
  it("Non existing team groups should not be added to the user's list of teams", () => {
    const extraneousTeamsList = [...multiTeamUser, 'nonexisting']
    extraneousTeamsList.forEach((teamId) => otomiStack.createTeam({ name: teamId }))
    const user = getUser(multiTeamJWT, otomiStack)
    expect(user.teams).to.deep.equal(multiTeamUser)
    expect(user.isAdmin).to.be.false
  })
})
