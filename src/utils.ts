import cloneDeep from 'lodash/cloneDeep'

interface ResourceBase {
  name: string
}
export function validateEnv(envVars) {
  // Ensure required ENV vars are set
  const requiredEnv = ['GIT_LOCAL_PATH', 'GIT_REPO_URL', 'GIT_USER', 'GIT_PASSWORD', 'GIT_EMAIL', 'GIT_BRANCH']

  const unsetEnv = requiredEnv.filter((env) => !(typeof envVars[env] !== 'undefined'))

  if (unsetEnv.length > 0) {
    throw new Error(`Required ENV variables are not set: [${unsetEnv.join(', ')}]`)
  }
}

export function validateConfig() {
  validateEnv(process.env)
}

export function setSignalHandlers(server) {
  process.on('SIGTERM', function () {
    console.log('Received SIGTERM signal. \nFinishing all requests')
    server.close(function () {
      console.log('Finished all requests.')
    })
  })

  process.on('SIGINT', function () {
    console.log('Received SIGINT signal \nFinishing all requests')
    server.close(function () {
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

export function getPublicUrl(serviceDomain, serviceName, teamId, cluster) {
  if (!serviceDomain) {
    // Fallback mechanism for exposed service that does not have its public url specified in values
    return {
      subdomain: `${serviceName}.team-${teamId}`,
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
