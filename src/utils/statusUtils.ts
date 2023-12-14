import { getBuildStatus, getServiceStatus, getWorkloadStatus } from 'src/k8s_operations'
import { getIo } from 'src/middleware'

export function emitStatus(resources: any, resourceName: string, domainSuffix: string): any {
  console.log('emitStatus: ', resourceName)

  const resourcesStatusPromises = resources.map((resource) => {
    if (resourceName === 'workloads') {
      return getWorkloadStatus(`team-${resource.teamId}-${resource.name}`).then((status: any) => {
        return { [resource.name]: { status } }
      })
    }
    if (resourceName === 'builds') {
      return getBuildStatus(`team-${resource.teamId}`, resource.mode.type, resource.name).then((status: any) => {
        return { [resource.name]: { status } }
      })
    }
    if (resourceName === 'services') {
      return getServiceStatus(`team-${resource.teamId}`, domainSuffix, resource.name).then((status: any) => {
        return { [resource.name]: { status } }
      })
    }
  })

  Promise.all(resourcesStatusPromises).then((statuses) => {
    const resourcesStatus = Object.assign({}, ...statuses)
    getIo().emit(resourceName, resourcesStatus)
  })
}
