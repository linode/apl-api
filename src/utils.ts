import cleanDeep, { CleanOptions } from 'clean-deep'
import cloneDeep from 'lodash/cloneDeep'
import { Cluster, Dns } from './otomi-models'

export function arrayToObject(array: [] = [], keyName: string, keyValue: string): Record<string, unknown> {
  const obj = {}
  array.forEach((item) => {
    const cloneItem = cloneDeep(item)
    obj[cloneItem[keyName]] = cloneItem[keyValue]
  })
  return obj
}

export function objectToArray(
  obj: Record<string, unknown> = {},
  keyName: string,
  keyValue: string,
): Array<Record<string, unknown>> {
  const arr = Object.keys(obj).map((key) => {
    const tmp = {}
    tmp[keyName] = key
    tmp[keyValue] = obj[key]
    return tmp
  })
  return arr
}

export function getObjectPaths(tree: Record<string, unknown>): Array<string> {
  const leaves: string[] = []
  function walk(obj, path = ''): void {
    Object.keys(obj).forEach((n) => {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(n)) {
        if (obj instanceof Array) {
          if (typeof obj[n] !== 'object') leaves.push(`${path}[${n}]`)
          else walk(obj[n], `${path}[${n}]`)
        } else if (typeof obj[n] === 'object') {
          walk(obj[n], `${path}.${n}`)
        } else {
          leaves.push(`${path}.${n}`)
        }
      } else {
        console.error(`No property: ${n}`)
      }
    })
  }
  walk(tree, '')

  const rawLeaves = leaves.map((x: string) => {
    return x.substring(1)
  })
  return rawLeaves
}

interface PublicUrl {
  subdomain: string
  domain: string
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
  dns?: Dns
  cluster: Cluster
}): PublicUrl {
  if (!domain) {
    // Fallback mechanism for exposed service that does not have its public url specified in values
    return {
      subdomain: `${name}.team-${teamId}`,
      domain: cluster.domainSuffix || '',
    }
  }

  const zones = [cluster.domainSuffix, ...(dns?.zones || [])]
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
    emptyArrays: true,
    emptyObjects: true,
    nullValues: true,
    undefinedValues: true,
  }
  return cleanDeep(obj, options)
}

export function getTeamJobsFilePath(teamId: string): string {
  return `./env/teams/jobs.${teamId}.yaml`
}

export function getTeamJobsJsonPath(teamId: string): string {
  return `teamConfig.teams.${teamId}.jobs`
}

export function getTeamSecretsFilePath(teamId: string): string {
  return `./env/teams/external-secrets.${teamId}.yaml`
}

export function getTeamSecretsJsonPath(teamId: string): string {
  return `teamConfig.teams.${teamId}.secrets`
}

export function getTeamServicesFilePath(teamId: string): string {
  return `./env/teams/services.${teamId}.yaml`
}

export function getTeamServicesJsonPath(teamId: string): string {
  return `teamConfig.teams.${teamId}.services`
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
