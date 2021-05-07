import cloneDeep from 'lodash/cloneDeep'
import { Cluster } from './otomi-models'

export function arrayToObject(array: [], keyName: string, keyValue: string): any {
  const obj = {}
  array.forEach((item) => {
    const cloneItem = cloneDeep(item)
    obj[cloneItem[keyName]] = cloneItem[keyValue]
  })
  // const obj = array.reduce((accumulator, currentValue: ResourceBase) => {
  //   const cloneItem = cloneDeep(currentValue)
  //   obj[cloneItem[keyField]] = cloneItem[keyValue]
  //   delete cloneItem.name
  //   return obj
  // }, {})
  return obj
}

export function objectToArray(obj: any, keyName: string, keyValue: string): Array<any> {
  const arr = Object.keys(obj).map((key) => {
    const tmp = {}
    tmp[keyName] = key
    tmp[keyValue] = obj[key]
    return tmp
  })
  return arr
}

export function getObjectPaths(tree: any): Array<string> {
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

export function getPublicUrl(
  serviceDomain?: string,
  serviceName?: string,
  teamId?: string,
  cluster?: Cluster,
): PublicUrl {
  if (!serviceDomain) {
    // Fallback mechanism for exposed service that does not have its public url specified in values
    return {
      subdomain: `${serviceName}.team-${teamId}.${cluster!.name}`,
      domain: cluster?.dnsZones?.length ? cluster.dnsZones[0] : '',
    }
  }

  const dnsZones = [...(cluster!.dnsZones || [])]
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

export function getTeamSecretsFilePath(teamId: string, clusterId: string): string {
  return `./env/clouds/${clusterId}/external-secrets.${teamId}.yaml`
}

export function getTeamSecretsJsonPath(teamId: string): string {
  return `teamConfig.teams.${teamId}.externalSecrets`
}
