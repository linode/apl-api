import { expect } from 'chai'
import Authz, { getTeamAuthz, getViolatedAttributes } from './authz'
import { OpenAPIDoc, SessionRole, User, TeamSelfService } from './otomi-models'

const sessionTeam: User = {
  authz: {},
  isAdmin: false,
  roles: [SessionRole.User],
  name: 'joe',
  email: 'a@b.c',
  teams: ['mercury'],
}

const sessionAdmin: User = { ...sessionTeam, roles: [SessionRole.Admin] }

describe('Schema wise permissions', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            admin: ['read-any', 'update-any'],
            team: ['read'],
          },
          properties: {
            name: {
              type: 'string',
            },
            ingress: {
              type: 'object',
            },
            teamId: { type: 'string' },
          },
        },
      },
    },
  }

  const data = {
    name: 'svc',
    ingress: { f1: 'test' },
  }
  it('An admin can get and update all services', () => {
    const authz = new Authz(spec)
    expect(authz.validateWithRbac('create', 'Service', sessionAdmin, 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('delete', 'Service', sessionAdmin, 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('read', 'Service', sessionAdmin, 'mercury', data)).to.be.true
    expect(authz.validateWithRbac('update', 'Service', sessionAdmin, 'mercury', data)).to.be.true
  })

  it('A team can only get its own service', () => {
    const authz = new Authz(spec)

    expect(authz.validateWithRbac('create', 'Service', sessionTeam, 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('delete', 'Service', sessionTeam, 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('read', 'Service', sessionTeam, 'mercury', data)).to.be.true
    expect(authz.validateWithRbac('update', 'Service', sessionTeam, 'mercury', data)).to.be.false
  })
})

describe('Ownership wise resource permissions', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            team: ['update'],
          },
          properties: {
            name: {
              type: 'string',
            },
            teamId: {
              type: 'string',
            },
          },
        },
      },
    },
    paths: {},
    security: [],
  }

  it('A team cannot update service from another team', () => {
    const data = {
      name: 'svc',
      // teamId: 'venus',
    }
    const authz = new Authz(spec)
    expect(authz.validateWithRbac('update', 'Service', sessionTeam, 'venus', data)).to.be.false
  })
  it('A team can update its own service', () => {
    const data = {
      name: 'svc',
      // teamId: 'mercury',
    }
    const authz = new Authz(spec)
    expect(authz.validateWithRbac('update', 'Service', sessionTeam, 'mercury', data)).to.be.true
  })
})

describe('Schema collection wise permissions', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Services: {
          properties: {},
          type: 'array',
          'x-acl': {
            admin: ['read-any'],
            team: ['read-any'],
          },
          items: {
            type: 'object',
          },
        },
      },
    },
    paths: {},
    security: [],
  }

  it('An admin can only get collection of services', () => {
    const authz = new Authz(spec)
    expect(authz.validateWithRbac('create', 'Services', sessionAdmin, 'mercury')).to.be.false
    expect(authz.validateWithRbac('delete', 'Services', sessionAdmin, 'mercury')).to.be.false
    expect(authz.validateWithRbac('read', 'Services', sessionAdmin, 'mercury')).to.be.true
    expect(authz.validateWithRbac('update', 'Services', sessionAdmin, 'mercury')).to.be.false
  })

  it('A team can only get collection of services', () => {
    const authz = new Authz(spec)
    expect(authz.validateWithRbac('create', 'Services', sessionTeam, 'mercury')).to.be.false
    expect(authz.validateWithRbac('delete', 'Services', sessionTeam, 'mercury')).to.be.false
    expect(authz.validateWithRbac('read', 'Services', sessionTeam, 'mercury')).to.be.true
    expect(authz.validateWithRbac('update', 'Services', sessionTeam, 'mercury')).to.be.false
  })
})
describe('Permissions tests', () => {
  it('should render correct team authz', () => {
    const selfServiceFlags: TeamSelfService = {
      Team: ['resourceQuota'],
      Service: ['ingress.public'],
    }

    const schema = {
      properties: {
        Team: { items: { enum: ['alerts', 'oidc', 'resourceQuota'] } },
        Service: { items: { enum: ['ingress.public'] } },
      },
    }
    const authz = getTeamAuthz(selfServiceFlags, schema)
    const expected = {
      deniedAttributes: {
        Team: ['alerts', 'oidc', 'selfService'],
        Service: [],
      },
    }
    expect(expected).to.deep.equal(authz)
  })

  it('should get violated authorization paths', () => {
    const d = getViolatedAttributes(['a.b', 'c', 'd'], { a: { b: 1, c: 2 }, d: 4, e: 5 })
    expect(d).to.deep.equal(['a.b', 'd'])
  })
})
