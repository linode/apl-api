import cleanDeep, { CleanOptions } from 'clean-deep'
import cloneDeep from 'lodash/cloneDeep'
import { Dns } from './otomi-models'

interface ResourceBase {
  name: string
}

export function arrayToObject(array: [], keyName: string, keyValue: string): object {
  const obj = {}
  array.forEach((item) => {
    const cloneItem = cloneDeep(item)
    obj[cloneItem[keyName]] = cloneItem[keyValue]
  })
  return obj
}

export function objectToArray(obj: object, keyName: string, keyValue: string): Array<object> {
  const arr = Object.keys(obj).map((key) => {
    const tmp = {}
    tmp[keyName] = key
    tmp[keyValue] = obj[key]
    return tmp
  })
  return arr
}

export function getObjectPaths(tree: object): Array<string> {
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

export function getPublicUrl(serviceDomain?: string, serviceName?: string, teamId?: string, dns?: Dns): PublicUrl {
  if (!serviceDomain) {
    // Fallback mechanism for exposed service that does not have its public url specified in values
    return {
      subdomain: `${serviceName}.team-${teamId}`,
      domain: dns?.domain || '',
    }
  }

  const dnsZones = [...(dns!.dnsZones || [])]
  dnsZones.push(dns?.domain || '')
  // Sort by length descending
  dnsZones.sort((a, b) => b.length - a.length)
  for (let i = 0; i < dnsZones.length; i += 1) {
    if (serviceDomain.endsWith(dnsZones[i])) {
      const subdomainLength = serviceDomain.length - dnsZones[i].length - 1
      return { subdomain: serviceDomain.substring(0, subdomainLength), domain: dnsZones[i] }
    }
  }

  // Custom domain that is not visible in clusters.yaml values
  return { subdomain: '', domain: serviceDomain }
}

export function removeBlankAttributes(obj: object): object {
  const options: CleanOptions = {
    emptyArrays: true,
    emptyObjects: true,
    nullValues: true,
    undefinedValues: true,
  }
  return cleanDeep(obj, options)
}

export function getTeamSecretsFilePath(teamId: string): string {
  return `./env/teams/external-secrets.${teamId}.yaml`
}

export function getTeamSecretsJsonPath(teamId: string): string {
  return `teamConfig.teams.${teamId}.externalSecrets`
}
