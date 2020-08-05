import { expect } from 'chai'
import Authz from './authz'
import { OpenApi, SessionRole, SessionUser } from './otomi-models'

const sessionTeam: SessionUser = { isAdmin: false, roles: [SessionRole.User], email: 'a@b.c', teams: ['mercury'] }

const sessionAdmin: SessionUser = { isAdmin: true, roles: [SessionRole.Admin], email: 'a@b.c', teams: ['mercury'] }

describe('Schema wise permissions', () => {
  const spec: OpenApi = {
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
  const spec: OpenApi = {
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
  const spec: OpenApi = {
    components: {
      schemas: {
        Services: {
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
  }

  it('An admin can only get collection of services', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'Services', sessionAdmin, 'mercury', null)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Services', sessionAdmin, 'mercury', null)).to.be.false
    expect(authz.isUserAuthorized('read', 'Services', sessionAdmin, 'mercury', null)).to.be.true
    expect(authz.isUserAuthorized('update', 'Services', sessionAdmin, 'mercury', null)).to.be.false
  })

  it('A team can only get collection of services', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'Services', sessionTeam, 'mercury', null)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Services', sessionTeam, 'mercury', null)).to.be.false
    expect(authz.isUserAuthorized('read', 'Services', sessionTeam, 'mercury', null)).to.be.true
    expect(authz.isUserAuthorized('update', 'Services', sessionTeam, 'mercury', null)).to.be.false
  })
})

describe('Property wise permissions', () => {
  const spec: OpenApi = {
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
