import Authz from 'src/authz'
import { OpenAPIDoc, SessionRole, SessionUser } from 'src/otomi-models'

const sessionTeam: SessionUser = {
  authz: {},
  isPlatformAdmin: false,
  isTeamAdmin: false,
  roles: [SessionRole.TeamMember],
  name: 'joe',
  email: 'a@b.c',
  teams: ['mercury'],
}

const sessionAdmin: SessionUser = { ...sessionTeam, roles: [SessionRole.PlatformAdmin] }

describe('Schema wise permissions', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            platformAdmin: ['read-any', 'update-any'],
            teamAdmin: ['read-any', 'update-any'],
            teamMember: ['read'],
          },
          properties: {
            name: { type: 'string' },
            ingress: { type: 'object' },
            teamId: { type: 'string' },
          },
        },
      },
    },
  }

  test('An admin can get and update all services', () => {
    const authz = new Authz(spec).init(sessionAdmin)
    expect(authz.validateWithCasl('create', 'Service', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('delete', 'Service', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('read', 'Service', 'mercury')).toBe(true)
    expect(authz.validateWithCasl('update', 'Service', 'mercury')).toBe(true)
  })

  test('A team can only get its own service', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('create', 'Service', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('delete', 'Service', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('read', 'Service', 'mercury')).toBe(true)
    expect(authz.validateWithCasl('update', 'Service', 'mercury')).toBe(false)
  })
})

describe('Ownership wise resource permissions', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            teamMember: ['update'],
          },
          properties: {
            name: { type: 'string' },
            teamId: { type: 'string' },
          },
        },
      },
    },
    paths: {},
    security: [],
  }

  test('A team cannot update service from another team', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('update', 'Service', 'venus')).toBe(false)
  })

  test('A team can update its own service', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('update', 'Service', 'mercury')).toBe(true)
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
            platformAdmin: ['read-any'],
            teamAdmin: ['read-any'],
            teamMember: ['read-any'],
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

  test('An admin can only get collection of services', () => {
    const authz = new Authz(spec).init(sessionAdmin)
    expect(authz.validateWithCasl('create', 'Services', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('delete', 'Services', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('read', 'Services', 'mercury')).toBe(true)
    expect(authz.validateWithCasl('update', 'Services', 'mercury')).toBe(false)
  })

  test('A team can only get collection of services', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('create', 'Services', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('delete', 'Services', 'mercury')).toBe(false)
    expect(authz.validateWithCasl('read', 'Services', 'mercury')).toBe(true)
    expect(authz.validateWithCasl('update', 'Services', 'mercury')).toBe(false)
  })

  test('A team can doSomething', () => {
    const authz = new Authz(spec).init(sessionTeam)
    sessionTeam.authz = { teamA: { deniedAttributes: { Team: ['a', 'b'] } } }
    expect(() => authz.hasSelfService('teamA', 'doSomething')).not.toThrow()
    sessionTeam.authz = {}
  })

  test('A team cannot doSomething', () => {
    const authz = new Authz(spec).init(sessionTeam)
    sessionTeam.authz = { teamA: { deniedAttributes: { Team: ['a', 'b', 'doSomething'] } } }
    expect(() => authz.hasSelfService('teamA', 'doSomething')).not.toThrow()
    sessionTeam.authz = {}
  })
})
