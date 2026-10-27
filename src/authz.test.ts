import Authz from 'src/authz'
import { OpenAPIDoc, SessionRole, SessionUser } from 'src/otomi-models'
import generatedSchema from './generated-schema.json'

const spec = generatedSchema as unknown as OpenAPIDoc & { openapi: string }

const teamId = 'mercury'
const otherTeamId = 'venus'

const httpMethods = ['get', 'post', 'put', 'patch', 'delete'] as const

const sessionTeam = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  authz: {},
  isPlatformAdmin: false,
  isTeamAdmin: false,
  roles: [SessionRole.TeamMember],
  name: 'joe',
  email: 'a@b.c',
  teams: [teamId],
  ...overrides,
})

const sessionPlatformAdmin = (): SessionUser =>
  sessionTeam({
    isPlatformAdmin: true,
    roles: [SessionRole.PlatformAdmin],
  })

const sessionTeamAdmin = (): SessionUser =>
  sessionTeam({
    isTeamAdmin: true,
    roles: [SessionRole.TeamAdmin],
  })

const getAclHolder = (schema: any) => {
  if (schema?.['x-acl']) return schema
  return schema?.allOf?.find((item: any) => item?.['x-acl'])
}

describe('Authz using generated OpenAPI schema', () => {
  test('loads the generated OpenAPI schema', () => {
    expect(spec.openapi).toBeDefined()
    expect(spec.security).toBeDefined()
    expect(spec.paths).toBeDefined()
    expect(spec.components?.schemas).toBeDefined()
    expect(spec.components.schemas.Service).toBeDefined()
    expect(spec.components.schemas.Service['x-acl']).toBeDefined()
  })

  test('platform admin can CRUD Service for any team', () => {
    const authz = new Authz(spec).init(sessionPlatformAdmin())

    expect(authz.validateWithCasl('create', 'Service', otherTeamId)).toBe(true)
    expect(authz.validateWithCasl('read', 'Service', otherTeamId)).toBe(true)
    expect(authz.validateWithCasl('update', 'Service', otherTeamId)).toBe(true)
    expect(authz.validateWithCasl('delete', 'Service', otherTeamId)).toBe(true)
  })

  test('team admin can CRUD Service for own team', () => {
    const authz = new Authz(spec).init(sessionTeamAdmin())

    expect(authz.validateWithCasl('create', 'Service', teamId)).toBe(true)
    expect(authz.validateWithCasl('read', 'Service', teamId)).toBe(true)
    expect(authz.validateWithCasl('update', 'Service', teamId)).toBe(true)
    expect(authz.validateWithCasl('delete', 'Service', teamId)).toBe(true)
  })

  test('team admin cannot CRUD Service for another team', () => {
    const authz = new Authz(spec).init(sessionTeamAdmin())

    expect(authz.validateWithCasl('create', 'Service', otherTeamId)).toBe(false)
    expect(authz.validateWithCasl('read', 'Service', otherTeamId)).toBe(false)
    expect(authz.validateWithCasl('update', 'Service', otherTeamId)).toBe(false)
    expect(authz.validateWithCasl('delete', 'Service', otherTeamId)).toBe(false)
  })

  test('team member can CRUD Service for own team according to generated schema', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.validateWithCasl('create', 'Service', teamId)).toBe(true)
    expect(authz.validateWithCasl('read', 'Service', teamId)).toBe(true)
    expect(authz.validateWithCasl('update', 'Service', teamId)).toBe(true)
    expect(authz.validateWithCasl('delete', 'Service', teamId)).toBe(true)
  })

  test('team member cannot CRUD Service for another team', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.validateWithCasl('create', 'Service', otherTeamId)).toBe(false)
    expect(authz.validateWithCasl('read', 'Service', otherTeamId)).toBe(false)
    expect(authz.validateWithCasl('update', 'Service', otherTeamId)).toBe(false)
    expect(authz.validateWithCasl('delete', 'Service', otherTeamId)).toBe(false)
  })

  test('Team schema permissions are stricter than Service permissions', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.validateWithCasl('read', 'Team', teamId)).toBe(true)
    expect(authz.validateWithCasl('create', 'Team', teamId)).toBe(false)
    expect(authz.validateWithCasl('update', 'Team', teamId)).toBe(false)
    expect(authz.validateWithCasl('delete', 'Team', teamId)).toBe(false)
  })

  test('returns false for missing schema name', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.validateWithCasl('read', '', teamId)).toBe(false)
  })

  test('returns false for unknown schema name', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.validateWithCasl('read', 'DefinitelyNotASchema', teamId)).toBe(false)
  })

  test('property without x-acl inherits resource permission', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.validatePropertyWithCasl('read', 'Service', 'name', teamId)).toBe(true)
  })
})

describe('Generated OpenAPI ACL contract', () => {
  test('every secured operation has x-aclSchema pointing to a schema with x-acl', () => {
    const failures: string[] = []

    Object.entries(spec.paths ?? {}).forEach(([pathName, pathItem]) => {
      httpMethods.forEach((method) => {
        const operation = (pathItem as any)[method]
        if (!operation) return

        const isSecurityExplicitlyDisabled = Array.isArray(operation.security) && operation.security.length === 0
        if (isSecurityExplicitlyDisabled) return

        const operationId = operation.operationId ?? '<missing operationId>'
        const location = `${method.toUpperCase()} ${pathName} (${operationId})`

        if (!operation.operationId) {
          failures.push(`${location} is missing operationId`)
        }

        const aclSchemaName = operation['x-aclSchema']

        if (!aclSchemaName) {
          failures.push(`${location} is missing x-aclSchema`)
          return
        }

        const schema = spec.components.schemas[aclSchemaName]

        if (!schema) {
          failures.push(`${location} references missing schema "${aclSchemaName}"`)
          return
        }

        if (!getAclHolder(schema)) {
          failures.push(`${location} references schema "${aclSchemaName}" but it has no x-acl`)
        }
      })
    })

    expect(failures).toEqual([])
  })
})

describe('Self-service permissions', () => {
  test('allows self-service permission when it is not denied', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.hasSelfService(teamId, 'createServices')).toBe(true)
    expect(authz.hasSelfService(teamId, 'editSecurityPolicies')).toBe(true)
    expect(authz.hasSelfService(teamId, 'useCloudShell')).toBe(true)
    expect(authz.hasSelfService(teamId, 'downloadKubeconfig')).toBe(true)
    expect(authz.hasSelfService(teamId, 'downloadDockerLogin')).toBe(true)
  })

  test('denies self-service permission when listed in deniedAttributes.teamMembers', () => {
    const authz = new Authz(spec).init(
      sessionTeam({
        authz: {
          [teamId]: {
            deniedAttributes: {
              teamMembers: ['editSecurityPolicies'],
            },
          },
        },
      }),
    )

    expect(authz.hasSelfService(teamId, 'editSecurityPolicies')).toBe(false)
    expect(authz.hasSelfService(teamId, 'downloadKubeconfig')).toBe(true)
  })

  test('denied permission for another team does not deny current team permission', () => {
    const authz = new Authz(spec).init(
      sessionTeam({
        authz: {
          [otherTeamId]: {
            deniedAttributes: {
              teamMembers: ['editSecurityPolicies'],
            },
          },
        },
      }),
    )

    expect(authz.hasSelfService(teamId, 'editSecurityPolicies')).toBe(true)
  })

  test('unknown self-service permission currently defaults to allowed', () => {
    const authz = new Authz(spec).init(sessionTeam())

    expect(authz.hasSelfService(teamId, 'notARealPermission')).toBe(true)
  })
})
