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

describe('Self-service permissions', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Kubecfg: { type: 'object', 'x-acl': { teamMember: ['read'] }, properties: {} },
        DockerConfig: { type: 'object', 'x-acl': { teamMember: ['read'] }, properties: {} },
        Cloudtty: { type: 'object', 'x-acl': { teamMember: ['create'] }, properties: {} },
        Policy: { type: 'object', 'x-acl': { teamMember: ['update'] }, properties: {} },
      },
    },
    paths: {},
    security: [],
  }

  const teamId = 'mercury'
  let authz: Authz
  beforeEach(() => {
    authz = new Authz(spec).init({ ...sessionTeam, teams: [teamId] })
  })

  test('Team member can download kubeconfig (self-service)', () => {
    expect(authz.hasSelfService(teamId, 'downloadKubeconfig')).toBeDefined()
  })
  test('Team member can download docker login (self-service)', () => {
    expect(authz.hasSelfService(teamId, 'downloadDockerLogin')).toBeDefined()
  })
  test('Team member can use cloud shell (self-service)', () => {
    expect(authz.hasSelfService(teamId, 'useCloudShell')).toBeDefined()
  })
  test('Team member can edit security policies (self-service)', () => {
    expect(authz.hasSelfService(teamId, 'editSecurityPolicies')).toBeDefined()
  })
  test('Team member cannot use undefined self-service permission', () => {
    expect(authz.hasSelfService(teamId, 'notARealPermission')).toBeDefined()
  })
})

describe('Authz middleware cases', () => {
  const spec: OpenAPIDoc = {
    components: { schemas: { Service: { type: 'object', 'x-acl': { teamMember: ['read'] }, properties: {} } } },
    paths: {},
    security: [],
  }
  let authz: Authz
  beforeEach(() => {
    authz = new Authz(spec).init(sessionTeam)
  })

  test('Returns false if user is not in team', () => {
    expect(authz.validateWithCasl('read', 'Service', 'notMyTeam')).toBe(false)
  })
  test('Returns true if user is in team', () => {
    expect(authz.validateWithCasl('read', 'Service', 'mercury')).toBe(true)
  })
  test('Returns false if schema is missing', () => {
    expect(authz.validateWithCasl('read', '', 'mercury')).toBe(false)
  })
  test('Returns false if action is not allowed', () => {
    expect(authz.validateWithCasl('delete', 'Service', 'mercury')).toBe(false)
  })
})

describe('Platform admin, team admin and team member scenarios', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Resource: {
          type: 'object',
          'x-acl': {
            platformAdmin: ['create-any', 'read-any', 'update-any', 'delete-any'],
            teamAdmin: ['create', 'read', 'update', 'delete'],
            teamMember: ['read'],
          },
          properties: {},
        },
      },
    },
    paths: {},
    security: [],
  }
  const platformAdmin: SessionUser = { ...sessionTeam, isPlatformAdmin: true, roles: [SessionRole.PlatformAdmin] }
  const teamAdmin: SessionUser = { ...sessionTeam, isTeamAdmin: true, roles: [SessionRole.TeamAdmin] }
  const myTeam = 'mercury'
  const otherTeam = 'venus'

  test('Platform admin can CRUD any resource', () => {
    const authz = new Authz(spec).init(platformAdmin)
    expect(authz.validateWithCasl('create', 'Resource', 'anyTeam')).toBe(true)
    expect(authz.validateWithCasl('read', 'Resource', 'anyTeam')).toBe(true)
    expect(authz.validateWithCasl('update', 'Resource', 'anyTeam')).toBe(true)
    expect(authz.validateWithCasl('delete', 'Resource', 'anyTeam')).toBe(true)
  })
  test('Team admin can CRUD resources in their team', () => {
    const authz = new Authz(spec).init(teamAdmin)
    expect(authz.validateWithCasl('create', 'Resource', myTeam)).toBe(true)
    expect(authz.validateWithCasl('read', 'Resource', myTeam)).toBe(true)
    expect(authz.validateWithCasl('update', 'Resource', myTeam)).toBe(true)
    expect(authz.validateWithCasl('delete', 'Resource', myTeam)).toBe(true)
  })
  test('Team admin cannot CRUD resources in other teams', () => {
    const authz = new Authz(spec).init(teamAdmin)
    expect(authz.validateWithCasl('create', 'Resource', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('read', 'Resource', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('update', 'Resource', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('delete', 'Resource', otherTeam)).toBe(false)
  })
  test('Team member can Read resources', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('read', 'Resource', myTeam)).toBe(true)
  })
  test('Team member cannot CUD resources', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('create', 'Resource', myTeam)).toBe(false)
    expect(authz.validateWithCasl('update', 'Resource', myTeam)).toBe(false)
    expect(authz.validateWithCasl('delete', 'Resource', myTeam)).toBe(false)
  })
  test('Team member cannot CRUD resources in other teams', () => {
    const authz = new Authz(spec).init(sessionTeam)
    expect(authz.validateWithCasl('create', 'Resource', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('read', 'Resource', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('update', 'Resource', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('delete', 'Resource', otherTeam)).toBe(false)
  })
  test('Platform admin can perform self-service actions', () => {
    const authz = new Authz(spec).init(platformAdmin)
    expect(authz.hasSelfService('anyTeam', 'downloadKubeconfig')).toBeDefined()
    expect(authz.hasSelfService('anyTeam', 'downloadDockerLogin')).toBeDefined()
    expect(authz.hasSelfService('anyTeam', 'useCloudShell')).toBeDefined()
    expect(authz.hasSelfService('anyTeam', 'editSecurityPolicies')).toBeDefined()
  })
})

describe('Fallback to CASL when no self-service permission', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        App: { type: 'object', 'x-acl': { teamMember: ['read'] }, properties: {} },
      },
    },
    paths: {},
    security: [],
  }
  let authz: Authz
  beforeEach(() => {
    authz = new Authz(spec).init(sessionTeam)
  })
  test('Falls back to CASL for non-self-service action', () => {
    expect(authz.validateWithCasl('read', 'App', 'mercury')).toBe(true)
  })
  test('Returns false for denied action', () => {
    expect(authz.validateWithCasl('delete', 'App', 'mercury')).toBe(false)
  })
})

describe('Team member self-service vs. other team resources', () => {
  const spec: OpenAPIDoc = {
    components: {
      schemas: {
        Service: {
          type: 'object',
          'x-acl': {
            teamMember: ['read', 'update', 'delete', 'create'],
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
  const myTeam = 'mercury'
  const otherTeam = 'venus'
  let authz: Authz
  beforeEach(() => {
    authz = new Authz(spec).init({ ...sessionTeam, teams: [myTeam] })
  })

  test('Team member can CRUD own team resource', () => {
    expect(authz.validateWithCasl('create', 'Service', myTeam)).toBe(true)
    expect(authz.validateWithCasl('read', 'Service', myTeam)).toBe(true)
    expect(authz.validateWithCasl('update', 'Service', myTeam)).toBe(true)
    expect(authz.validateWithCasl('delete', 'Service', myTeam)).toBe(true)
  })

  test('Team member cannot CRUD another team resource', () => {
    expect(authz.validateWithCasl('create', 'Service', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('read', 'Service', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('update', 'Service', otherTeam)).toBe(false)
    expect(authz.validateWithCasl('delete', 'Service', otherTeam)).toBe(false)
  })

  test('Team member with no self-service permission cannot perform custom self-service action', () => {
    sessionTeam.authz = { [myTeam]: { deniedAttributes: { Policy: ['editSecurityPolicies'] } } }
    expect(() => authz.hasSelfService(myTeam, 'editSecurityPolicies')).not.toThrow()
    sessionTeam.authz = {}
  })

  test('Team member with no self-service permission cannot perform custom self-service action in another team', () => {
    sessionTeam.authz = { [otherTeam]: { deniedAttributes: { Policy: ['editSecurityPolicies'] } } }
    expect(() => authz.hasSelfService(myTeam, 'editSecurityPolicies')).not.toThrow()
    sessionTeam.authz = {}
  })

  test('Team member with self-service permission can perform allowed self-service action', () => {
    expect(() => authz.hasSelfService(myTeam, 'read')).not.toThrow()
  })
})
