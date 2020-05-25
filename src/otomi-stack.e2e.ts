import './test-init'
import { expect } from 'chai'
import OtomiStack from './otomi-stack'

describe('Secret creation', () => {
  let otomiStack: OtomiStack
  const teamId = 'otomi'
  const name = 'somesecreettt'
  const server = 'eu.gcr.io'
  const data = { username: 'someusernameee', password: 'somepassworddd' }
  let promise

  beforeEach(() => {
    otomiStack = new OtomiStack()
  })

  it('should create a valid pull secret', async () => {
    promise = otomiStack.createPullSecret(teamId, name, server, data.password, data.username)
    await promise
    const list = await otomiStack.getPullSecrets(teamId)
    expect(list.map((i) => i.name)).to.contain(name)
  })
  it('should throw exception on secret creation for existing name', () => {
    const check = otomiStack.createPullSecret(teamId, name, server, data.password, data.username)
    return expect(check).to.eventually.be.rejectedWith(`Secret '${name}' already exists in namespace 'team-${teamId}'`)
  })
  it('should delete an existing secret successfully', async () => {
    await promise
    await otomiStack.deletePullSecret(teamId, name)
    const list = await otomiStack.getPullSecrets(teamId)
    expect(list.map((i) => i.name)).to.not.contain(name)
  })
})
