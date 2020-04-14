const _ = require('lodash')

function validateEnv(envVars) {
  // Ensure required ENV vars are set
  let requiredEnv = ['GIT_LOCAL_PATH', 'GIT_REPO_URL', 'GIT_USER', 'GIT_PASSWORD', 'GIT_EMAIL', 'GIT_BRANCH']

  let unsetEnv = requiredEnv.filter((env) => !(typeof envVars[env] !== 'undefined'))

  if (unsetEnv.length > 0) {
    throw new Error('Required ENV variables are not set: [' + unsetEnv.join(', ') + ']')
  }
}

function validatePaths(env) {}

function validateConfig() {
  validateEnv(process.env)
  validatePaths(process.env)
}

function setSignalHandlers(server) {
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

function arrayToObject(array, keyField, keyValue) {
  const obj = array.reduce((obj, item) => {
    const cloneItem = _.cloneDeep(item)
    obj[cloneItem[keyField]] = cloneItem[keyValue]
    delete cloneItem['name']
    return obj
  }, {})
  return obj
}

function objectToArray(obj, keyName, keyValue) {
  const arr = Object.keys(obj).map((key) => {
    let tmp = {}
    tmp[keyName] = key
    tmp[keyValue] = obj[key]
    return tmp
  })
  return arr
}

function getPublicUrl(serviceDomain, serviceName, teamId, cluster) {
  if (!serviceDomain) {
    return {
      subdomain: `${serviceName}.team-${teamId}.${cluster.cluster}`,
      domain: cluster.dnsZone,
    }
  }

  if (serviceDomain.endsWith(cluster.dnsZone)) {
    const subdomainLength = serviceDomain.length - cluster.dnsZone.length - 1
    return { subdomain: serviceDomain.substring(0, subdomainLength), domain: cluster.dnsZone }
  }

  // Custom domain that is not visible in clusters.yaml values
  return { subdomain: '', domain: serviceDomain }
}

module.exports = {
  validateConfig,
  validateEnv,
  setSignalHandlers,
  arrayToObject,
  objectToArray,
  getPublicUrl,
}
