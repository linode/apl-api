import { describe, expect, it } from '@jest/globals'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

interface PatternDefinition {
  type?: string
  pattern?: string
}

type DefinitionsFile = Record<string, PatternDefinition>

const schemaPath = path.resolve(process.cwd(), 'src/openapi/definitions.yaml')
const definitions = YAML.parse(fs.readFileSync(schemaPath, 'utf8')) as DefinitionsFile

function getPattern(name: string): string {
  const pattern = definitions[name]?.pattern

  if (!pattern) {
    throw new Error(`Pattern "${name}" was not found in ${schemaPath}`)
  }

  return pattern
}

function getRegex(name: string): RegExp {
  return new RegExp(getPattern(name))
}

function expectValid(patternName: string, values: string[]) {
  const regex = getRegex(patternName)

  values.forEach((value) => {
    expect(regex.test(value)).toBe(true)
  })
}

function expectInvalid(patternName: string, values: string[]) {
  const regex = getRegex(patternName)

  values.forEach((value) => {
    expect(regex.test(value)).toBe(false)
  })
}

function expectRegexToComplete(patternName: string, pattern: string, inputs: string[]) {
  try {
    execFileSync(
      process.execPath,
      [
        '-e',
        `
          const fs = require('fs')

          const pattern = process.argv[1]
          const inputs = JSON.parse(fs.readFileSync(0, 'utf8'))
          const regex = new RegExp(pattern)

          for (const input of inputs) {
            regex.test(input)
          }
        `,
        pattern,
      ],
      {
        input: JSON.stringify(inputs),
        timeout: 1_000,
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024,
      },
    )
  } catch (error) {
    const cause = error instanceof Error ? `${error.name}: ${error.message}` : String(error)

    throw new Error(
      [
        `Potential unsafe regex detected: "${patternName}"`,
        `Pattern: ${pattern}`,
        `Input lengths: ${inputs.map((input) => input.length).join(', ')}`,
        `Cause: ${cause}`,
      ].join('\n'),
    )
  }
}

const redosCases: Record<string, string[]> = {
  annotation: [`${'a'.repeat(100_000)}/`, `${'a/'.repeat(50_000)}!`],

  domain: [`${'a.'.repeat(50_000)}!`, `${'a-'.repeat(50_000)}!`],

  duration: [`${'1h'.repeat(50_000)}!`, `${'1'.repeat(100_000)}x`],

  email: [`${'a.'.repeat(50_000)}@example.com!`, `${'a@'.repeat(50_000)}!`],

  hostPort: [`${'a.'.repeat(50_000)}:65536`, `${'a-'.repeat(50_000)}:invalid`],

  k8sName: [`${'a-'.repeat(50_000)}!`],

  idName: [`${'a-'.repeat(50_000)}!`],

  quantityCpu: [`${'1'.repeat(100_000)}x`, `${'1'.repeat(100_000)}.0000`],

  quantityMem: [`${'1'.repeat(100_000)}MiX`],

  repoUrl: [`https://${'a.'.repeat(50_000)}com/org/repo!`, `https://example.com/${'a/'.repeat(50_000)}!`],

  size: [`${'1'.repeat(100_000)}GiX`],

  url: [`https://${'a.'.repeat(50_000)}!`, `https://example.com/${'a/'.repeat(50_000)}!`],

  wildcardDomainOrIp: [`${'a.'.repeat(50_000)}!`, `${'a:'.repeat(50_000)}!`],

  imageRegistry: [`${'a.'.repeat(50_000)}!`, `${'a/'.repeat(50_000)}!`],

  imageTag: [`${'a-'.repeat(50_000)}!`, `${'a.'.repeat(50_000)}!`],

  ipV4Address: [`${'255.'.repeat(50_000)}999`, `${'1'.repeat(100_000)}.`],

  path: [`${'/a'.repeat(50_000)}!`, `${'a/'.repeat(50_000)}!`],

  wordCharacterPattern: [`${'a'.repeat(100_000)}!`, `${'_'.repeat(100_000)}!`],
}

describe('OpenAPI definition regex patterns', () => {
  it('loads regex patterns from definitions.yaml', () => {
    const patternNames = Object.entries(definitions)
      .filter(([, definition]) => typeof definition.pattern === 'string')
      .map(([name]) => name)

    expect(patternNames.length).toBeGreaterThan(0)

    expect(patternNames).toEqual(
      expect.arrayContaining([
        'annotation',
        'domain',
        'duration',
        'email',
        'hostPort',
        'k8sName',
        'idName',
        'quantityCpu',
        'quantityMem',
        'repoUrl',
        'size',
        'url',
        'wildcardDomainOrIp',
      ]),
    )
  })

  it('compiles every configured regex', () => {
    Object.entries(definitions).forEach(([name, definition]) => {
      const { pattern } = definition

      if (typeof pattern !== 'string') return

      expect(() => new RegExp(pattern)).not.toThrow()

      if (!pattern.startsWith('^')) {
        console.warn(`Pattern "${name}" is missing a start anchor`)
      }

      if (!pattern.endsWith('$')) {
        console.warn(`Pattern "${name}" is missing an end anchor`)
      }
    })
  })

  describe('annotation', () => {
    it('accepts valid annotations', () => {
      expectValid('annotation', ['name', 'example.com/name', 'prefix/value'])
    })

    it('rejects malformed annotations', () => {
      expectInvalid('annotation', ['', '/name', 'prefix/', 'prefix/name/extra'])
    })
  })

  describe('domain', () => {
    it('accepts structurally valid domains', () => {
      expectValid('domain', ['example.com', 'api.example.com', 'service-name', 'a'])
    })

    it('rejects invalid boundary characters', () => {
      expectInvalid('domain', ['', '-example.com', 'example.com-', '.example.com', 'example.com.', 'example_com'])
    })
  })

  describe('duration', () => {
    it('accepts supported duration tokens', () => {
      expectValid('duration', ['0', '1s', '500ms', '1h30m', '2w3d4h'])
    })

    it('rejects malformed durations', () => {
      expectInvalid('duration', ['', '1', 'ms', '1x', '-1h', '1 h'])
    })
  })

  describe('email', () => {
    it('accepts structurally valid email addresses', () => {
      expectValid('email', ['user@example.com', 'first.last+tag@example.com', 'a@b.co'])
    })

    it('rejects malformed email addresses', () => {
      expectInvalid('email', ['', 'user', '@example.com', 'user@', 'user example@example.com'])
    })
  })

  describe('hostPort', () => {
    it('accepts valid host and port combinations', () => {
      expectValid('hostPort', ['localhost:80', 'example.com:443', 'service-name:8080', 'example.com:65535'])
    })

    it('rejects invalid ports and missing components', () => {
      expectInvalid('hostPort', [
        'example.com',
        ':8080',
        'example.com:0',
        'example.com:65536',
        'example.com:not-a-port',
      ])
    })
  })

  describe('k8sName', () => {
    it('accepts valid Kubernetes names', () => {
      expectValid('k8sName', ['a', 'secret', 'secret-name', 'secret_name', 'secret1'])
    })

    it('rejects invalid Kubernetes names', () => {
      expectInvalid('k8sName', ['', 'Secret', '-secret', '_secret', 'secret-', 'secret_', 'secret.name'])
    })
  })

  describe('idName', () => {
    it('accepts valid ID names', () => {
      expectValid('idName', ['a', 'secret', 'secret-name', 'secret1'])
    })

    it('rejects invalid ID names', () => {
      expectInvalid('idName', ['', 'Secret', '-secret', 'secret-', 'secret.name', 'secret_name'])
    })
  })

  describe('quantityCpu', () => {
    it('accepts valid CPU quantities', () => {
      expectValid('quantityCpu', ['1', '12', '0.5', '1.250', '500m'])
    })

    it('rejects invalid CPU quantities', () => {
      expectInvalid('quantityCpu', ['0', '.5', '1.0000', '0m', '-1', '1Gi'])
    })
  })

  describe('quantityMem', () => {
    it('accepts valid memory quantities', () => {
      expectValid('quantityMem', ['1Mi', '512Mi', '1.5Gi', '10G', '2Ti'])
    })

    it('rejects invalid memory quantities', () => {
      expectInvalid('quantityMem', ['1', '.5Gi', '1.5', '-1Gi', '1MB'])
    })
  })

  describe('repoUrl', () => {
    it('accepts supported repository URLs', () => {
      expectValid('repoUrl', [
        'github.com/org/repo',
        'https://github.com/org/repo',
        'https://github.com/org/repo.git',
        'https://github.com/org/repo/',
      ])
    })

    it('rejects unsupported repository URLs', () => {
      expectInvalid('repoUrl', [
        '',
        'https://github.com',
        'https://github.com/org',
        'ssh://git@github.com/org/repo',
        'https://github.com/group/subgroup/repo',
      ])
    })
  })

  describe('size', () => {
    it('accepts supported sizes', () => {
      expectValid('size', ['1', '1.5', '10G', '10Gi', '2Ti'])
    })

    it('rejects malformed sizes', () => {
      expectInvalid('size', ['', '.5Gi', '-1Gi', '10Mi', '10GB'])
    })
  })

  describe('url', () => {
    it('accepts supported URLs', () => {
      expectValid('url', [
        'https://example.com',
        'http://localhost',
        'http://service-name:8080/path',
        'https://example.com/path?key=value',
      ])
    })

    it('rejects malformed URLs', () => {
      expectInvalid('url', ['', 'example.com', 'ftp://example.com', 'https://', 'https://example.com invalid'])
    })
  })

  describe('wildcardDomainOrIp', () => {
    it('accepts supported domains and approximate IPv6 values', () => {
      expectValid('wildcardDomainOrIp', ['example.com', '*.example.com', '2001:db8:0:0:0:0:0:1'])
    })

    it('rejects malformed values', () => {
      expectInvalid('wildcardDomainOrIp', ['', '*example.com', 'https://example.com', '*.example.com/path'])
    })
  })

  // Verify that every regex safely handles adversarial input.
  //
  // The test runs each pattern against deliberately large "almost valid" inputs
  // (for example, thousands of repeated labels followed by an invalid character).
  // These inputs are known to trigger catastrophic backtracking in unsafe regexes.
  // Each pattern is evaluated in a separate Node process with a timeout so a
  // problematic regex cannot hang or OOM the Jest process itself.

  // A safe regex should complete within the timeout for all adversarial inputs.
  // If a pattern exhibits catastrophic backtracking, the child process is expected
  // to time out or terminate, causing this test to fail and identify the pattern.
  describe('regex denial-of-service protection', () => {
    it.each(Object.entries(redosCases))(
      '%s completes adversarial inputs without catastrophic backtracking',
      (patternName, inputs) => {
        const pattern = getPattern(patternName)

        expectRegexToComplete(patternName, pattern, inputs)
      },
      5_000,
    )

    it('has a ReDoS test for every regex pattern', () => {
      const regexPatterns = new Set(
        Object.entries(definitions)
          .filter(([, definition]) => definition.pattern)
          .map(([name]) => name),
      )

      const testedPatterns = new Set(Object.keys(redosCases))

      const missing = [...regexPatterns].filter((name) => !testedPatterns.has(name))
      const obsolete = [...testedPatterns].filter((name) => !regexPatterns.has(name))

      expect({
        missing,
        obsolete,
      }).toEqual({
        missing: [],
        obsolete: [],
      })
    })
  })
})
