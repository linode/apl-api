import axios from 'axios'
import cleanDeep, { CleanOptions } from 'clean-deep'
import { pathExists } from 'fs-extra'
import { readFile } from 'fs/promises'
import { isArray, memoize, mergeWith, omit } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import { Cluster, Dns } from 'src/otomi-models'
import { parse } from 'yaml'
import { BASEURL } from './constants'
import { cleanEnv, GIT_PASSWORD, GIT_REPO_URL, GIT_USER } from './validators'

const env = cleanEnv({
  GIT_PASSWORD,
  GIT_REPO_URL,
  GIT_USER,
})

export function arrayToObject(array: [] = [], keyName = 'name', keyValue = 'value'): Record<string, unknown> {
  const obj = {}
  array.forEach((item) => {
    const cloneItem = cloneDeep(item)
    obj[cloneItem[keyName]] = cloneItem[keyValue]
  })
  return obj
}

export function objectToArray(
  obj: Record<string, unknown> = {},
  keyName = 'name',
  keyValue = 'value',
): Array<Record<string, unknown>> {
  const arr = Object.keys(obj).map((key) => {
    const tmp = {}
    tmp[keyName] = key
    tmp[keyValue] = obj[key]
    return tmp
  })
  return arr
}

export const flattenObject = (
  obj: Record<string, any>,
  path: string | undefined = undefined,
): { [key: string]: string } => {
  return Object.entries(obj)
    .flatMap(([key, value]) => {
      const subPath = path ? `${path}.${key}` : key
      if (typeof value === 'object' && !Array.isArray(value) && value !== null)
        return flattenObject(value as Record<string, any>, subPath)
      return { [subPath]: value }
    })
    .reduce((acc, base) => {
      return { ...acc, ...base }
    }, {})
}

export const loadYaml = async (path: string, opts?: { noError: boolean }): Promise<Record<string, any> | undefined> => {
  if (!(await pathExists(path))) {
    if (opts?.noError) return undefined
    throw new Error(`${path} does not exist`)
  }
  return parse(await readFile(path, 'utf-8')) as Record<string, any>
}

const valuesSchemaEndpointUrl = `${BASEURL}/apl/schema`
let valuesSchema: Record<string, any>

export const getValuesSchema = async (): Promise<Record<string, any>> => {
  const res = await axios.get(valuesSchemaEndpointUrl)
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
}: {
  domain?: string
  name?: string
  teamId?: string
  cluster: Cluster
  dns: Dns
}): {
  subdomain: string
  domain: string
} {
  if (!domain) {
    // Fallback mechanism for exposed service that does not have its public url specified in values
    return {
      subdomain: `${name}-${teamId}`,
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
