import cloneDeep from 'lodash/cloneDeep'
import { bool, cleanEnv, str } from 'envalid'

interface ResourceBase {
  name: string
}

export function getEnv() {
  const env = cleanEnv(
    process.env,
    {
      DEBUG: str({
        desc: 'Enables/disables specific debugging namespaces. Refer to: https://github.com/visionmedia/debug',
        devDefault: '*',
        default: undefined,
      }),
      CLUSTER_APISERVER: str({
        desc: 'A public IP address of kubernetes api server that is used to generate kubeconfig',
        devDefault: '127.0.0.2',
      }),
      CLUSTER_ID: str({ desc: 'A cluster ID used to identify kubernetes cluster', devDefault: 'google/dev' }),
      CLUSTER_NAME: str({
        desc: 'A cluster name that is used to generate kubeconfig',
        devDefault: 'gke_otomi-cloud_europe-west4_otomi-dev-demo',
      }),
      DB_PATH: str({
        desc: 'A path to database file for data persistency. By default database is stored only in memory',
        default: undefined,
      }),
      DISABLE_SYNC: bool({ devDefault: true, default: false }),
      DISABLE_AUTH: bool({ devDefault: false, default: false }),
      GIT_BRANCH: str({ desc: 'A git branch used for fetching and pushing commits', default: 'master' }),
      GIT_EMAIL: str({ desc: 'An email for git config', devDefault: 'user@dev.com' }),
      GIT_LOCAL_PATH: str({ desc: 'A path where git repository is clone', default: '/tmp/otomi-stack' }),
      GIT_PASSWORD: str({ desc: 'A git access password', devDefault: 'dev-pass' }),
      GIT_REPO_URL: str({ desc: 'A git repository url', devDefault: 'http://localhost/dev.git' }),
      GIT_USER: str({ desc: 'A name of harbor admin user', devDefault: 'dev' }),
      NODE_ENV: str({
        choices: ['test', 'development', 'production'],
        desc: 'An environment mode',
        default: 'production',
      }),
      OIDC_ENDPOINT: str({ devDefault: 'https://bla.dida' }),
      OIDC_NAME: str({ devDefault: 'otomi' }),
      OTOMI_CORE_FILE_PATH: str({
        desc: 'A path to a file that contains data about core services',
        devDefault: './test/core.yaml',
        default: '/etc/otomi/core.yaml',
      }),
      OTOMI_CLUSTERS_FILE_PATH: str({
        desc: 'A path to a file that contains data about kubernetes clusters',
        devDefault: './env/clusters.yaml',
        default: './env/clusters.yaml',
      }),
      TOOLS_HOST: str({
        desc: 'A host the tools service that performs file encryption/decryption',
        default: 'localhost',
      }),
    },
    { strict: true },
  )
  return env
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
