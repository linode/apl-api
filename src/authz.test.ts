import { expect } from 'chai'
import Authz from './authz'
import { OpenApi, Session } from './api.d'

const session: Session = {
  user: { role: 'team', email: 'a@b.c', teamId: 'mercury', isAdmin: false },
}

const sessionAdmin: Session = {
  user: { role: 'admin', email: 'a@b.c', teamId: 'mercury', isAdmin: true },
}

describe('Schema wise permissions', () => {
  const spec: OpenApi = {
    components: {
      schemas: {
        Service: {
          'x-acl': {
            admin: ['get', 'update'],
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

  it('An admin can only get and update service', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'Service', sessionAdmin, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Service', sessionAdmin, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'Service', sessionAdmin, 'mercury', data)).to.be.true
    expect(authz.isUserAuthorized('update', 'Service', sessionAdmin, 'mercury', data)).to.be.true
  })

  it('A team can only get its own service', () => {
    const authz = new Authz(spec)

    expect(authz.isUserAuthorized('create', 'Service', session, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Service', session, 'mercury', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'Service', session, 'mercury', data)).to.be.true
    expect(authz.isUserAuthorized('update', 'Service', session, 'mercury', data)).to.be.false
  })

  it('A team cannot update a service from other team', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'Service', session, 'venus', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'Service', session, 'venus', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'Service', session, 'venus', data)).to.be.true
    expect(authz.isUserAuthorized('update', 'Service', session, 'venus', data)).to.be.false
  })
})

describe('Property wise permissions', () => {
  const spec: OpenApi = {
    components: {
      schemas: {
        Service: {
          'x-acl': {
            team: ['get', 'update'],
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
    expect(authz.isUserAuthorized('update', 'Service', session, 'mercury', data1)).to.be.true
    expect(authz.isUserAuthorized('update', 'Service', session, 'mercury', data2)).to.be.false
  })
})
