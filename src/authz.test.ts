import { expect } from 'chai'
import Authz from './authz'
import { OpenApi } from './api.d'

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
    name: 'mercury',
    ingress: { f1: 'test' },
    teamId: 'mercury',
  }
  it('An admin can only get and update service', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'admin', 'mercury', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'admin', 'mercury', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'admin', 'mercury', 'Service', data)).to.be.true
    expect(authz.isUserAuthorized('update', 'admin', 'mercury', 'Service', data)).to.be.true
  })
  it('An admin can not perform action on service schema if it acts on behalf of other team', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'admin', 'venus', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'admin', 'venus', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'admin', 'venus', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('update', 'admin', 'venus', 'Service', data)).to.be.false
  })

  it('A team can get its own service', () => {
    const authz = new Authz(spec)

    expect(authz.isUserAuthorized('create', 'team', 'mercury', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'team', 'mercury', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'team', 'mercury', 'Service', data)).to.be.true
    expect(authz.isUserAuthorized('update', 'team', 'mercury', 'Service', data)).to.be.false
  })

  it('A team cannot update a service from other team', () => {
    const authz = new Authz(spec)
    expect(authz.isUserAuthorized('create', 'team', 'venus', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('delete', 'team', 'venus', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('get', 'team', 'venus', 'Service', data)).to.be.false
    expect(authz.isUserAuthorized('update', 'team', 'venus', 'Service', data)).to.be.false
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
    teamId: 'mercury',
  }
  const data2 = {
    name: 'svcName',
    ingress: 'test',
    teamId: 'mercury',
  }
  it('A team can update all service properties except ingress', () => {
    const authz = new Authz(spec)

    authz.printRules('team', 'myTeam')
    console.log(authz.relevantRuleFor('update', 'team', 'mercury', 'Service', data2))
    expect(authz.isUserAuthorized('update', 'team', 'mercury', 'Service', data1)).to.be.true
    expect(authz.isUserAuthorized('update', 'team', 'mercury', 'Service', data2)).to.be.false
  })
})
