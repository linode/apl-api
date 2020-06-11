import { isEqual, mergeWith, set } from 'lodash'
import { Repo } from './repo'
import { Db } from './db'

function mergeHelper(objValue, nextObjectValue): any {
  if (Array.isArray(objValue)) {
    // helmfile does not merge arrays
    return nextObjectValue
  }
  return undefined
}

export function mergeLikeHelm(o1: any, o2: any) {
  return mergeWith(o1, o2, mergeHelper)
}

export default function getPackedSettings() {
  // empty
}

export function keyChanges(o1: any, o2: any): object {
  const changes = {}

  function walkObject(objectA, objectB, path = '') {
    if (Array.isArray(objectB) && !isEqual(objectB, objectA)) {
      // helmfile does not merge arrays
      changes[path] = objectB
      return
    }

    Object.entries(objectB).forEach(([key, value]) => {
      const currentPath = path === '' ? key : `${path}.${key}`
      // if (objectA[key] === undefined) {
      //   // item that is added
      //   changes[currentPath] = value;
      // }
      if (value !== objectA[key]) {
        if (typeof value === 'object' && typeof objectA[key] === 'object') {
          walkObject(objectA[key], value, currentPath)
        } else {
          changes[currentPath] = value
        }
      }
    })
  }

  walkObject(o1, o2)
  return changes
}

export function diffLikeHelm(baseObject: any, topObject: any): any {
  const changes = keyChanges(baseObject, topObject)
  const changeObj = {}
  Object.entries(changes).forEach(([key, value]) => {
    set(changeObj, key, value)
  })
  return changeObj
}

function createSettingItems(db: Db, settings: any, scope: string) {
  db.createItem('chartsSettings', settings.charts, { scope })
  db.createItem('clusterSettings', settings.cluster, { scope })
  db.createItem('ingressSettings', settings.ingress, { scope })
  db.createItem('oidcSettings', settings.oidc, { scope })
  db.createItem('sitesSettings', settings.sites, { scope })
}
export function loadSettings(repo: Repo, db: Db) {
  // load common settings
  const scope = 'global'
  console.log(``)
  const path = 'env/default.yaml'
  const globalSettings = repo.readFile(path)
  createSettingItems(db, globalSettings, scope)

  const allClusters = db.getCollection('clusters')
  const clouds = [...new Set(allClusters.map((cluster) => cluster.cloud))]
  clouds.forEach((cloud) => {
    const path = `env/$cloud/default.yaml`
    const scope = `global/$cloud`
    const cloudSettings = mergeLikeHelm(globalSettings, repo.readFile(path))
    createSettingItems(db, cloudSettings, scope)

    const clusters = db.getCollection('clusters', { cloud })
    clusters.forEach((cluster) => {
      const path = `env/${cloud}/${cluster}.yaml`
      const scope = `global/${cloud}/${cluster}`
      const clusterSettings = mergeLikeHelm(cloudSettings, repo.readFile(path))
      createSettingItems(db, clusterSettings, scope)
    })
  })
}

// export function saveSettings(repo: Repo, db: Db) {
//   // save common settings
//   // save common cloud settings
//   // save cloud specific settings
//   // save cluster specific settings
// }
