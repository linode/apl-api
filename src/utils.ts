import $RefParser from '@apidevtools/json-schema-ref-parser'
import cleanDeep, { CleanOptions } from 'clean-deep'
import { existsSync, readFileSync } from 'fs'
import { load } from 'js-yaml'
import { isArray, isEqual, memoize, mergeWith, omit } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import { resolve } from 'path'
import { Cluster, Dns } from './otomi-models'
import { cleanEnv, GIT_LOCAL_PATH } from './validators'

const env = cleanEnv({
  GIT_LOCAL_PATH,
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
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) return flattenObject(value, subPath)
      return { [subPath]: value }
    })
    .reduce((acc, base) => {
      return { ...acc, ...base }
    }, {})
}

export const loadYaml = (path: string, opts?: { noError: boolean }): Record<string, any> | undefined => {
  if (!existsSync(path)) {
    if (opts?.noError) return undefined
    throw new Error(`${path} does not exist`)
  }
  return load(readFileSync(path, 'utf-8')) as Record<string, any>
}

let valuesSchema: Record<string, any>
export const getValuesSchema = async (): Promise<Record<string, any>> => {
  if (valuesSchema) return valuesSchema
  const schema = loadYaml(resolve(__dirname, 'values-schema.yaml'))
  const derefSchema = await $RefParser.dereference(schema as $RefParser.JSONSchema)
  valuesSchema = omit(derefSchema, ['definitions'])
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

export const nullify = (data) =>
  traverse(data, (o, i) => {
    // eslint-disable-next-line no-param-reassign
    if (typeof o[i] === 'object' && isEqual(o[i], {})) o[i] = null
  })

export const isOf = (o): boolean => Object.keys(o).some((p) => ['anyOf', 'allOf', 'oneOf'].includes(p))

export const extract = memoize((o, f) => {
  const schemaKeywords = ['properties', 'items', 'anyOf', 'allOf', 'oneOf', 'default', 'x-secret', 'x-acl']
  const leafs = {}
  traverse(o, (o, i, path) => {
    const res = f(o, i, path)
    if (!res) return
    const p = path
      .split('.')
      .filter((p: string) => !schemaKeywords.includes(p) && p !== `${parseInt(p, 10)}`)
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
      subdomain: `${name}.team-${teamId}`,
      domain: cluster!.domainSuffix || '',
    }
  }

  const zones = [cluster!.domainSuffix, ...(dns?.zones || [])]
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

export function removeBlankAttributes(obj: Record<string, unknown>): Record<string, unknown> {
  const options: CleanOptions = {
    emptyArrays: false,
    emptyObjects: true,
    emptyStrings: true,
    nullValues: true,
    undefinedValues: true,
  }
  return cleanDeep(obj, options)
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
export const argQuoteStrip = (s) => {
  if (['"', "'"].includes(s.charAt(0))) return s.substr(1, s.length - 2)
  if (s.includes("'") && !s.includes("\\'")) return s.replace(doubleQuoteMatcher, '')
  return s.replace(singleQuoteMatcher, '')
}

export const decryptedFilePostfix = () => {
  return existsSync(`${env.GIT_LOCAL_PATH}/.sops.yaml`) ? '.dec' : ''
}

// use lodash mergeWith to avoid merging arrays
export const mergeData = (orig, extra) => mergeWith(orig, extra, (a, b) => (isArray(b) ? b : undefined))
