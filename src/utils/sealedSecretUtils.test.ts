import { extractSecretPaths, extractSettingsSecrets, removeSettingsSecrets } from './sealedSecretUtils'

describe('extractSecretPaths', () => {
  it('finds x-secret in simple properties', () => {
    const schema = {
      properties: {
        adminPassword: { type: 'string', 'x-secret': '' },
        name: { type: 'string' },
      },
    }
    expect(extractSecretPaths(schema)).toEqual(['adminPassword'])
  })

  it('finds x-secret in nested properties', () => {
    const schema = {
      properties: {
        git: {
          type: 'object',
          properties: {
            repoUrl: { type: 'string' },
            password: { type: 'string', 'x-secret': '{{ randAlphaNum 20 }}' },
          },
        },
        globalPullSecret: {
          properties: {
            username: { type: 'string' },
            password: { type: 'string', 'x-secret': '' },
          },
        },
      },
    }
    const paths = extractSecretPaths(schema)
    expect(paths).toContain('git.password')
    expect(paths).toContain('globalPullSecret.password')
    expect(paths).not.toContain('git.repoUrl')
  })

  it('finds x-secret through oneOf branches', () => {
    const schema = {
      properties: {
        provider: {
          oneOf: [
            {
              properties: {
                aws: {
                  properties: {
                    credentials: {
                      properties: {
                        secretKey: { type: 'string', 'x-secret': '' },
                        accessKey: { type: 'string', 'x-secret': '' },
                      },
                    },
                  },
                },
              },
            },
            {
              properties: {
                digitalocean: {
                  properties: {
                    apiToken: { type: 'string', 'x-secret': '' },
                  },
                },
              },
            },
          ],
        },
      },
    }
    const paths = extractSecretPaths(schema)
    expect(paths).toContain('provider.aws.credentials.secretKey')
    expect(paths).toContain('provider.aws.credentials.accessKey')
    expect(paths).toContain('provider.digitalocean.apiToken')
  })

  it('finds x-secret in definitions', () => {
    const schema = {
      definitions: {
        accessKey: { type: 'string', 'x-secret': '' },
        region: { type: 'string' },
      },
    }
    const paths = extractSecretPaths(schema)
    expect(paths).toContain('accessKey')
    expect(paths).not.toContain('region')
  })

  it('returns empty array for schema without x-secret', () => {
    const schema = {
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    }
    expect(extractSecretPaths(schema)).toEqual([])
  })

  it('deduplicates paths', () => {
    const schema = {
      properties: {
        token: { type: 'string', 'x-secret': '' },
      },
      allOf: [
        {
          properties: {
            token: { type: 'string', 'x-secret': '' },
          },
        },
      ],
    }
    const paths = extractSecretPaths(schema)
    expect(paths.filter((p) => p === 'token')).toHaveLength(1)
  })

  it('handles otomi schema shape', () => {
    const schema = {
      properties: {
        adminPassword: { type: 'string', 'x-secret': '{{ randAlphaNum 20 }}' },
        isPreInstalled: { type: 'boolean' },
        globalPullSecret: {
          properties: {
            username: { type: 'string' },
            password: { type: 'string', 'x-secret': '' },
            email: { type: 'string' },
          },
        },
        git: {
          type: 'object',
          properties: {
            repoUrl: { type: 'string' },
            password: { type: 'string', 'x-secret': '{{ randAlphaNum 20 }}' },
            email: { type: 'string' },
          },
        },
      },
    }
    const paths = extractSecretPaths(schema)
    expect(paths).toContain('adminPassword')
    expect(paths).toContain('globalPullSecret.password')
    expect(paths).toContain('git.password')
    expect(paths).not.toContain('isPreInstalled')
    expect(paths).not.toContain('globalPullSecret.username')
    expect(paths).not.toContain('git.repoUrl')
  })
})

describe('extractSettingsSecrets', () => {
  it('extracts non-empty secret values', () => {
    const data = {
      adminPassword: 'secret123',
      git: { repoUrl: 'https://example.com', password: 'gitpass' },
      globalPullSecret: { username: 'user', password: 'pullpass' },
    }
    const paths = ['adminPassword', 'git.password', 'globalPullSecret.password']
    const secrets = extractSettingsSecrets(paths, data)
    expect(secrets).toEqual({
      adminPassword: 'secret123',
      git_password: 'gitpass',
      globalPullSecret_password: 'pullpass',
    })
  })

  it('skips empty and missing values', () => {
    const data = {
      adminPassword: '',
      git: { repoUrl: 'https://example.com' },
    }
    const paths = ['adminPassword', 'git.password', 'globalPullSecret.password']
    const secrets = extractSettingsSecrets(paths, data)
    expect(secrets).toEqual({})
  })

  it('returns empty record when no paths match', () => {
    const data = { name: 'test' }
    const secrets = extractSettingsSecrets(['nonexistent'], data)
    expect(secrets).toEqual({})
  })
})

describe('removeSettingsSecrets', () => {
  it('removes secret values from data', () => {
    const data = {
      adminPassword: 'secret123',
      name: 'test',
      git: { repoUrl: 'https://example.com', password: 'gitpass' },
    }
    const paths = ['adminPassword', 'git.password']
    removeSettingsSecrets(paths, data)
    expect(data).toEqual({
      name: 'test',
      git: { repoUrl: 'https://example.com' },
    })
  })

  it('handles missing paths gracefully', () => {
    const data = { name: 'test' }
    removeSettingsSecrets(['nonexistent', 'deeply.nested.path'], data)
    expect(data).toEqual({ name: 'test' })
  })
})
