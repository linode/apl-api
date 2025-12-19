import axios from 'axios'
import retry from 'async-retry'
import Debug from 'debug'
import cleanDeep, { CleanOptions } from 'clean-deep'
import { pathExists } from 'fs-extra'
import { readdir, readFile } from 'fs/promises'
import { isArray, isEmpty, memoize, mergeWith, omit } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import { Cluster, Dns } from 'src/otomi-models'
import { parse, stringify } from 'yaml'
import { BASEURL } from './constants'
import { cleanEnv, GIT_PASSWORD, STARTUP_RETRY_COUNT, STARTUP_RETRY_INTERVAL_MS } from './validators'

const debug = Debug('otomi:utils')

const env = cleanEnv({
  GIT_PASSWORD,
  STARTUP_RETRY_COUNT,
  STARTUP_RETRY_INTERVAL_MS,
})

export function arrayToObject(array: [] = [], keyName = 'name', keyValue = 'value'): Record<string, unknown> {
  const obj = {}
  if (!Array.isArray(array)) return array
  array.forEach((item) => {
    const cloneItem = cloneDeep(item)
    obj[cloneItem[keyName]] = cloneItem[keyValue]
  })
  return obj
}

export function valueArrayToObject(
  array?:
    | {
        key: string
        value: string
      }[]
    | undefined,
): Record<string, string> | undefined {
  if (!array || isEmpty(array)) {
    return undefined
  }
  const obj = {}
  array.forEach((item) => {
    obj[item.key] = item.value
  })
  return obj
}

export function mapObjectToKeyValueArray(obj?: Record<string, string>): { key: string; value: string }[] | undefined {
  if (!obj || isEmpty(obj)) {
    return undefined
  }
  return Object.entries(obj).map(([key, value]) => ({ key, value }))
}

export const flattenObject = (
  obj: Record<string, any>,
  path: string | undefined = undefined,
): { [key: string]: string } => {
  return Object.entries(obj)
    .flatMap(([key, value]) => {
      const subPath = path ? `${path}.${key}` : key
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        return flattenObject(value as Record<string, any>, subPath)
      }
      return { [subPath]: value }
    })
    .reduce((acc, base) => {
      return { ...acc, ...base }
    }, {})
}

export const loadYaml = async (path: string): Promise<Record<string, any> | undefined> => {
  if (!(await pathExists(path))) {
    throw new Error(`${path} does not exist`)
  }
  const rawFile = await readFile(path, 'utf-8')
  return parse(rawFile) as Record<string, any>
}

export async function loadRawYaml(path: string) {
  if (!(await pathExists(path))) {
    throw new Error(`${path} does not exist`)
  }
  const rawFile = await readFile(path, 'utf-8')
  return rawFile as any
}

const valuesSchemaEndpointUrl = `${BASEURL}/apl/schema`
let valuesSchema: Record<string, any>

export const getValuesSchema = async (): Promise<Record<string, any>> => {
  debug('Fetching values schema from tools server...')

  const res = await retry(
    async () => {
      try {
        return await axios.get(valuesSchemaEndpointUrl)
      } catch (error: any) {
        debug(`Tools server not ready yet (${error.code}), retrying...`)
        throw error
      }
    },
    {
      retries: env.STARTUP_RETRY_COUNT,
      minTimeout: env.STARTUP_RETRY_INTERVAL_MS,
      maxTimeout: env.STARTUP_RETRY_INTERVAL_MS,
    },
  )

  debug('Values schema fetched successfully')
  valuesSchema = omit(res.data, ['definitions'])
  return valuesSchema
}

export const traverse = (o, func, path = '') =>
  Object.getOwnPropertyNames(o).forEach((i) => {
    func(o, i, path)
    if (o[i] !== null && typeof o[i] === 'object') {
      // going one step down in the object tree!!
      traverse(o[i], func, path !== '' ? `${path}.${i}` : i)
    }
  })

export const isOf = (o: Record<string, any>): boolean =>
  Object.keys(o).some((p) => ['anyOf', 'allOf', 'oneOf'].includes(p))

export const extract = memoize((obj: Record<string, any>, f) => {
  const schemaKeywords = ['properties', 'items', 'anyOf', 'allOf', 'oneOf', 'default', 'x-secret', 'x-acl']
  const leafs = {}
  traverse(obj, (o, i, path) => {
    const res = f(o, i, path)
    if (!res) return
    const p = path
      .split('.')
      .filter((part: string) => !schemaKeywords.includes(part) && part !== `${parseInt(part, 10)}`)
      .join('.')
    if (!leafs[p]) leafs[p] = res
  })
  return leafs
})

export function getPaths(tree: Record<string, unknown>): Array<string> {
  return Object.keys(flattenObject(tree))
}

export function getServiceUrl({
  domain,
  name,
  teamId,
  cluster,
  dns,
  managedByKnative,
}: {
  domain?: string
  name?: string
  teamId?: string
  cluster: Cluster
  dns: Dns
  managedByKnative: boolean
}): {
  subdomain: string
  domain: string
} {
  const subdomain = managedByKnative ? `${name}-team-${teamId}` : `${name}-${teamId}`
  if (!domain) {
    // Fallback mechanism for exposed service that does not have its public url specified in values
    return {
      subdomain,
      domain: cluster!.domainSuffix || '',
    }
  }

  const zones = [`${cluster!.domainSuffix}`, ...(dns?.zones || [])]
  // Sort by length descending
  zones.sort((a, b) => b.length - a.length)
  for (let i = 0; i < zones.length; i += 1) {
    if (domain.endsWith(zones[i])) {
      const subdomainLength = domain.length - zones[i].length - 1
      return { subdomain: domain.substring(0, subdomainLength), domain: zones[i] }
    }
  }

  // Custom domain that is not visible in clusters.yaml values
  return { subdomain: '', domain }
}

export function removeBlankAttributes(obj: Record<string, unknown>, options?: CleanOptions): Record<string, unknown> {
  const defaultOptions: CleanOptions = {
    emptyArrays: false,
    emptyObjects: true,
    emptyStrings: true,
    nullValues: true,
    undefinedValues: true,
  }
  return cleanDeep(obj, { ...defaultOptions, ...options })
}

export const argSplit = /[^\s"']+|("[^"]*")|('[^']*')/g

export const argQuoteJoin = (a) =>
  a
    .map((s: string) => {
      if (['"', "'"].includes(s.charAt(0))) return s.substr(1, s.length - 2)
      const q = s.includes("'") && !s.includes("\\'") ? '"' : "'"
      return `${q}${s}${q}`
    })
    .join(' ')

const doubleQuoteMatcher = /"/g
const singleQuoteMatcher = /'/g
export const argQuoteStrip = (s: string) => {
  if (['"', "'"].includes(s.charAt(0))) return s.substr(1, s.length - 2)
  if (s.includes("'") && !s.includes("\\'")) return s.replace(doubleQuoteMatcher, '')
  return s.replace(singleQuoteMatcher, '')
}

// use lodash mergeWith to avoid merging arrays
export const mergeData = (orig, extra) => mergeWith(orig, extra, (a, b) => (isArray(b) ? b : undefined))

export const getDirNames = async (dir: string, opts?: { skipHidden: boolean }): Promise<string[]> => {
  const dirs = await readdir(dir, { withFileTypes: true })
  const dirNames: Array<string> = []
  dirs.map((dirOrFile) => {
    if (opts?.skipHidden && dirOrFile.name.startsWith('.')) return
    if (dirOrFile.isDirectory()) dirNames.push(dirOrFile.name)
  })
  return dirNames
}

export const objectToYaml = (obj: Record<string, any>, indent = 4, lineWidth = 200): string => {
  return isEmpty(obj) ? '' : stringify(obj, { indent, lineWidth })
}

export function sanitizeGitPassword(str?: string) {
  return str ? str.replaceAll(env.GIT_PASSWORD, '****') : ''
}

export function getSanitizedErrorMessage(error) {
  const message = error?.message
  if (!message) {
    return ''
  }
  return typeof message === 'string' ? sanitizeGitPassword(message) : `[unprocessable message type ${typeof message}]`
}
