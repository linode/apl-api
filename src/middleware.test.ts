import { expect } from 'chai'
import { getSessionUser } from './middleware'
import { JWT } from './otomi-models'

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
  it('A user in either admin or team-admin group should get admin role and have isAdmin', () => {
    const user = getSessionUser(adminJWT)
    expect(user.isAdmin).to.be.true
  })
  it('Multiple team groups should result in the same amount of teams', () => {
    const user = getSessionUser(multiTeamJWT)
    expect(user.teams).to.deep.equal(multiTeamUser)
    expect(user.isAdmin).to.be.false
  })
})
