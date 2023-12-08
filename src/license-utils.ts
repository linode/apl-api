import { License } from './otomi-models'

function getResourceCount(path: string, sessionStack: any): number {
  const count = sessionStack.db.getCollection(path).length
  // -1 is needed because the admin is a separate team
  if (path === 'teams') return count - 1
  return count
}

export function checkLicense(requestType: string, path: string, sessionStack: any) {
  if (requestType !== 'post') return
  const license: License = sessionStack.getLicense()
  // check if license is valid
  if (!license?.hasLicense) throw new Error('no license found')
  if (license?.isValid) {
    if (path === 'projects') {
      const projectResources = ['services', 'workloads']
      for (const resource of projectResources) {
        const resourceCount = getResourceCount(resource, sessionStack)
        const capability = license.body!.capabilities[resource]
        // check license capabilities for each project resource
        if (resourceCount >= capability) throw new Error(`maximum number of ${resource} are reached for this license`)
      }
    }
    const resourceCount = getResourceCount(path, sessionStack)
    const capability = license.body!.capabilities[path]
    // check license capabilities
    if (resourceCount >= capability) throw new Error(`maximum number of ${path} are reached for this license`)
  } else throw new Error('license is not valid')
}
