import cleanDeep, { CleanOptions } from 'clean-deep'
import cloneDeep from 'lodash/cloneDeep'

interface ResourceBase {
  name: string
}

export function setSignalHandlers(server) {
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal. \nFinishing all requests')
    server.close(() => {
      console.log('Finished all requests.')
    })
  })

  process.on('SIGINT', () => {
    console.log('Received SIGINT signal \nFinishing all requests')
    server.close(() => {
      console.log('Finished all requests')
    })
  })
}

export function arrayToObject(array: [], keyName: string, keyValue: string) {
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

export function objectToArray(obj, keyName, keyValue) {
  const arr = Object.keys(obj).map((key) => {
    const tmp = {}
    tmp[keyName] = key
    tmp[keyValue] = obj[key]
    return tmp
  })
  return arr
}

export function getObjectPaths(tree) {
  const leaves = []
  const walk = function (obj, path) {
    path = path || ''

    for (const n in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(n)) {
        if (obj instanceof Array) {
          if (typeof obj[n] !== 'object') leaves.push(path + '[' + n + ']')
          else walk(obj[n], path + '[' + n + ']')
        } else if (typeof obj[n] === 'object') {
          walk(obj[n], path + '.' + n)
        } else {
          leaves.push(path + '.' + n)
        }
      } else {
        console.error(`No property: ${n}`)
      }
    }
  }
  walk(tree, '')

  const rawLeaves = leaves.map((x: string) => {
    return x.substring(1)
  })
  return rawLeaves
}

export function getPublicUrl(serviceDomain, serviceName, teamId, cluster) {
  if (!serviceDomain) {
    // Fallback mechanism for exposed service that does not have its public url specified in values
    return {
      subdomain: `${serviceName}.team-${teamId}.${cluster.name}`,
      domain: cluster.dnsZones[0],
    }
  }

  const dnsZones = [...cluster.dnsZones]
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

export function removeBlankAttributes(obj) {
  const options: CleanOptions = {
    emptyArrays: true,
    emptyObjects: true,
    nullValues: true,
    undefinedValues: true,
  }
  return cleanDeep(obj, options)
}

export function getTeamSecretsFilePath(teamId: string, clusterId: string) {
  return `./env/clouds/${clusterId}/external-secrets.${teamId}.yaml`
}

export function getTeamSecretsJsonPath(teamId: string) {
  return `teamConfig.teams.${teamId}.externalSecrets`
}
