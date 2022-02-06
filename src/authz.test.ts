import { expect } from 'chai'
import Authz from './authz'
import { OpenAPIDoc, SessionRole, User } from './otomi-models'

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
    const authz = new Authz(spec).init(sessionAdmin)
    expect(authz.validateWithRbac('create', 'Service', 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('delete', 'Service', 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('read', 'Service', 'mercury', data)).to.be.true
    expect(authz.validateWithRbac('update', 'Service', 'mercury', data)).to.be.true
  })

  it('A team can only get its own service', () => {
    const authz = new Authz(spec).init(sessionTeam)

    expect(authz.validateWithRbac('create', 'Service', 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('delete', 'Service', 'mercury', data)).to.be.false
    expect(authz.validateWithRbac('read', 'Service', 'mercury', data)).to.be.true
    expect(authz.validateWithRbac('update', 'Service', 'mercury', data)).to.be.false
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
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithRbac('update', 'Service', 'venus', data)).to.be.false
  })
  it('A team can update its own service', () => {
    const data = {
      name: 'svc',
      // teamId: 'mercury',
    }
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithRbac('update', 'Service', 'mercury', data)).to.be.true
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
    const authz = new Authz(spec).init(sessionAdmin)
    expect(authz.validateWithRbac('create', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithRbac('delete', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithRbac('read', 'Services', 'mercury')).to.be.true
    expect(authz.validateWithRbac('update', 'Services', 'mercury')).to.be.false
  })

  it('A team can only get collection of services', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithRbac('create', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithRbac('delete', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithRbac('read', 'Services', 'mercury')).to.be.true
    expect(authz.validateWithRbac('update', 'Services', 'mercury')).to.be.false
  })

  it('A team can doSomething', () => {
    const authz = new Authz(spec).init(sessionTeam)
    const user = {
      authz: { teamA: { deniedAttributes: { Team: ['a', 'b'] } } },
    } as unknown as User

    authz.hasSelfService('teamA', 'Team', 'doSomething')
  })
  it('A team can not doSomething', () => {
    const authz = new Authz(spec).init(sessionTeam)
    const user = {
      authz: { teamA: { deniedAttributes: { Team: ['a', 'b', 'doSomething'] } } },
    } as unknown as User
    authz.hasSelfService('teamA', 'Team', 'doSomething')
  })
})
