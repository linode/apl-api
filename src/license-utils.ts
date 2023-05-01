import { License } from './otomi-models'

export function checkLicenseCapabilities(request: string, license: License, state: any): boolean {
  let actionAllowed = false
  switch (request) {
    case 'teams':
      if (state.teams.length < license.body!.capabilities.teams) actionAllowed = true
      break
    case 'services':
      if (state.services.length < license.body!.capabilities.services) actionAllowed = true
      break
    case 'workloads':
      if (state.workloads.length < license.body!.capabilities.workloads) actionAllowed = true
      break
    default:
      break
  }
  return actionAllowed
}
