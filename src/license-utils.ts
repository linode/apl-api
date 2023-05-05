import { getSessionStack } from './middleware/session'
import { License, OpenApiRequest } from './otomi-models'

function checkLicenseCapabilities(request: string, license: License, databaseState: any): boolean {
  let actionAllowed = false
  switch (request) {
    case 'teams':
      if (databaseState.teams.length < license.body!.capabilities.teams) actionAllowed = true
      break
    case 'services':
      if (databaseState.services.length < license.body!.capabilities.services) actionAllowed = true
      break
    case 'workloads':
      if (databaseState.workloads.length < license.body!.capabilities.workloads) actionAllowed = true
      break
    default:
      break
  }
  return actionAllowed
}

export function checkLicense(requestType: string, path: string, license: License, databaseState: any) {
  if (requestType === 'post') {
    // check if license is valid
    if (!license?.hasLicense) throw new Error('no license found')
    if (license?.isValid) {
      // check license capabilities
      if (['teams', 'services', 'workloads'].includes(path)) {
        if (!checkLicenseCapabilities(path, license, databaseState))
          throw new Error(`maximum number of ${path} are reached for this license`)
      }
    } else throw new Error('license is not valid')
  } else return
}

// TODO: Delete - Debug purposes only
export async function removeLicense(req: OpenApiRequest) {
  const { email } = req.user || {}
  const sessionStack = await getSessionStack(email)
  if (sessionStack.getLicense()) sessionStack.removeLicense()
  else throw new Error('no license found')
}
