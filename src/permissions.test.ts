import { expect } from 'chai'
import sinon from 'sinon'
import OtomiStack from './otomi-stack'

import getPermissionMap, { getViolatedAuthorizationPaths } from './permission'

describe('Permissions tests', () => {
  it('should render correct permission map', () => {
    const otomi = new OtomiStack()
    // sinon.stub(otomi)
    const stub = sinon.stub(otomi, 'getTeamPermissions')
    stub.returns({ Team: ['alerts', 'oidc'], Service: [] })

    const m = getPermissionMap(
      ['teamA', 'teamB'],
      {
        properties: {
          Team: { items: { enum: ['alerts', 'oidc', 'resourceQuota'] } },
          Service: { items: { enum: ['ingress'] } },
        },
      },
      otomi,
    )
    const expected = {
      teamA: {
        Team: ['resourceQuota'],
        Service: ['ingress'],
      },
      teamB: {
        Team: ['resourceQuota'],
        Service: ['ingress'],
      },
    }
    expect(m).to.deep.equal(expected)
  })

  it('should get violated authorization paths', () => {
    const d = getViolatedAuthorizationPaths(['a.b', 'c', 'd'], { a: { b: 1, c: 2 }, d: 4, e: 5 })
    expect(d).to.deep.equal(['a.b', 'd'])
  })
})
