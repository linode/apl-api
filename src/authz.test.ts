import { expect } from 'chai'
import Authz, { getTeamAuthz, getViolatedAttributes } from './authz'
import { OpenAPIDoc, SessionRole, User, TeamPermissions } from './otomi-models'

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
    expect(authz.isUserAuthorized('create', 'Service', sessionAdmin, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Service', sessionAdmin, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('read', 'Service', sessionAdmin, 'mercury', data)).to.be.true
    expect(authz.isUserAuthorized('update', 'Service', sessionAdmin, 'mercury', data)).to.be.true
  })

  it('A team can only get its own service', () => {
    const authz = new Authz(spec)

    expect(authz.isUserAuthorized('create', 'Service', sessionTeam, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Service', sessionTeam, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('read', 'Service', sessionTeam, 'mercury', data)).to.be.true
    expect(authz.isUserAuthorized('update', 'Service', sessionTeam, 'mercury', data)).to.be.false
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
    expect(authz.isUserAuthorized('update', 'Service', sessionTeam, 'venus', data)).to.be.false
  })
  it('A team can update its own service', () => {
    const data = {
      name: 'svc',
      // teamId: 'mercury',
    }
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('update', 'Service', sessionTeam, 'mercury', data)).to.be.true
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
    expect(authz.isUserAuthorized('create', 'Services', sessionAdmin, 'mercury')).to.be.false
    expect(authz.isUserAuthorized('delete', 'Services', sessionAdmin, 'mercury')).to.be.false
    expect(authz.isUserAuthorized('read', 'Services', sessionAdmin, 'mercury')).to.be.true
    expect(authz.isUserAuthorized('update', 'Services', sessionAdmin, 'mercury')).to.be.false
  })

  it('A team can only get collection of services', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'Services', sessionTeam, 'mercury')).to.be.false
    expect(authz.isUserAuthorized('delete', 'Services', sessionTeam, 'mercury')).to.be.false
    expect(authz.isUserAuthorized('read', 'Services', sessionTeam, 'mercury')).to.be.true
    expect(authz.isUserAuthorized('update', 'Services', sessionTeam, 'mercury')).to.be.false
  })
})

describe('Property wise permissions', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            team: ['read', 'update'],
          },
          properties: {
            name: {
              type: 'string',
            },
            ingress: {
              'x-acl': {
                team: ['read'],
              },
              type: 'string',
            },
          },
        },
      },
    },
    paths: {},
    security: [],
  }

  const data1 = {
    name: 'svcName',
  }
  const data2 = {
    name: 'svcName',
    ingress: 'test',
  }
  it('A team can update all service properties except ingress', () => {
    const authz = new Authz(spec)
    expect(authz.getAllowedAttributes('update', 'Service', sessionTeam, data1)).to.eql(['name'])
    expect(authz.getAllowedAttributes('update', 'Service', sessionTeam, data2)).to.eql(['name'])
  })
})

describe('Permissions tests', () => {
  it('should render correct team authz', () => {
    const selfServiceFlags: TeamPermissions = {
      Team: ['resourceQuota'],
      Service: ['ingress'],
    }

    const schema = {
      properties: {
        Team: { items: { enum: ['alerts', 'oidc', 'resourceQuota'] } },
        Service: { items: { enum: ['ingress'] } },
      },
    }
    const authz = getTeamAuthz(selfServiceFlags, schema)
    const expected = {
      Team: ['alerts', 'oidc'],
      Service: [],
    }
    expect(authz).to.deep.equal(expected)
  })

  it('should get violated authorization paths', () => {
    const d = getViolatedAttributes(['a.b', 'c', 'd'], { a: { b: 1, c: 2 }, d: 4, e: 5 })
    expect(d).to.deep.equal(['a.b', 'd'])
  })
})
