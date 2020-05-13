import { expect } from 'chai'
import Authz from './authz'
import { OpenApi, Session } from './api.d'

const sessionTeam: Session = {
  user: { role: 'team', email: 'a@b.c', teamId: 'mercury', isAdmin: false },
}

const sessionAdmin: Session = {
  user: { role: 'admin', email: 'a@b.c', teamId: 'admin', isAdmin: true },
}

describe('Schema wise permissions', () => {
  const spec: OpenApi = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            admin: ['get-all', 'put-all'],
            team: ['get'],
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
    expect(authz.isUserAuthorized('get', 'Service', sessionAdmin, 'mercury', data)).to.be.true
    expect(authz.isUserAuthorized('put', 'Service', sessionAdmin, 'mercury', data)).to.be.true
  })

  it('A team can only get its own service', () => {
    const authz = new Authz(spec)

    expect(authz.isUserAuthorized('create', 'Service', sessionTeam, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Service', sessionTeam, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'Service', sessionTeam, 'mercury', data)).to.be.true
    expect(authz.isUserAuthorized('put', 'Service', sessionTeam, 'mercury', data)).to.be.false
  })
})

describe('Ownership wise resource permissions', () => {
  const spec: OpenApi = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            team: ['put'],
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
    expect(authz.isUserAuthorized('put', 'Service', sessionTeam, 'venus', data)).to.be.false
  })
  it('A team can update its own service', () => {
    const data = {
      name: 'svc',
      // teamId: 'mercury',
    }
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('put', 'Service', sessionTeam, 'mercury', data)).to.be.true
  })
})

describe('Schema collection wise permissions', () => {
  const spec: OpenApi = {
    components: {
      schemas: {
        Services: {
          type: 'array',
          'x-acl': {
            admin: ['get-all'],
            team: ['get-all'],
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
    expect(authz.isUserAuthorized('get', 'Services', sessionAdmin, 'mercury', null)).to.be.true
    expect(authz.isUserAuthorized('put', 'Services', sessionAdmin, 'mercury', null)).to.be.false
  })

  it('A team can only get collection of services', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'Services', sessionTeam, 'mercury', null)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Services', sessionTeam, 'mercury', null)).to.be.false
    expect(authz.isUserAuthorized('get', 'Services', sessionTeam, 'mercury', null)).to.be.true
    expect(authz.isUserAuthorized('put', 'Services', sessionTeam, 'mercury', null)).to.be.false
  })
})

describe('Property wise permissions', () => {
  const spec: OpenApi = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            team: ['get', 'put'],
          },
          properties: {
            name: {
              type: 'string',
            },
            ingress: {
              'x-acl': {
                team: ['get'],
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
    expect(authz.isUserAuthorized('put', 'Service', sessionTeam, 'mercury', data1)).to.be.true
    expect(authz.isUserAuthorized('put', 'Service', sessionTeam, 'mercury', data2)).to.be.false
  })
})
