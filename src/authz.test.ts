import { expect } from 'chai'
import Authz from 'src/authz'
import { OpenAPIDoc, SessionRole, User } from 'src/otomi-models'

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

  it('An admin can get and update all services', () => {
    const authz = new Authz(spec).init(sessionAdmin)
    expect(authz.validateWithCasl('create', 'Service', 'mercury')).to.be.false
    expect(authz.validateWithCasl('delete', 'Service', 'mercury')).to.be.false
    expect(authz.validateWithCasl('read', 'Service', 'mercury')).to.be.true
    expect(authz.validateWithCasl('update', 'Service', 'mercury')).to.be.true
  })

  it('A team can only get its own service', () => {
    const authz = new Authz(spec).init(sessionTeam)

    expect(authz.validateWithCasl('create', 'Service', 'mercury')).to.be.false
    expect(authz.validateWithCasl('delete', 'Service', 'mercury')).to.be.false
    expect(authz.validateWithCasl('read', 'Service', 'mercury')).to.be.true
    expect(authz.validateWithCasl('update', 'Service', 'mercury')).to.be.false
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
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('update', 'Service', 'venus')).to.be.false
  })
  it('A team can update its own service', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('update', 'Service', 'mercury')).to.be.true
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
    expect(authz.validateWithCasl('create', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithCasl('delete', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithCasl('read', 'Services', 'mercury')).to.be.true
    expect(authz.validateWithCasl('update', 'Services', 'mercury')).to.be.false
  })

  it('A team can only get collection of services', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('create', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithCasl('delete', 'Services', 'mercury')).to.be.false
    expect(authz.validateWithCasl('read', 'Services', 'mercury')).to.be.true
    expect(authz.validateWithCasl('update', 'Services', 'mercury')).to.be.false
  })

  it('A team can doSomething', () => {
    const authz = new Authz(spec).init(sessionTeam)
    sessionTeam.authz = { teamA: { deniedAttributes: { Team: ['a', 'b'] } } }
    authz.hasSelfService('teamA', 'Team', 'doSomething')
    sessionTeam.authz = {}
  })
  it('A team can not doSomething', () => {
    const authz = new Authz(spec).init(sessionTeam)
    sessionTeam.authz = { teamA: { deniedAttributes: { Team: ['a', 'b', 'doSomething'] } } }
    authz.hasSelfService('teamA', 'Team', 'doSomething')
    sessionTeam.authz = {}
  })
})
