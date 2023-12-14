import { getWorkloadStatus } from 'src/k8s_operations'
import { getIo } from 'src/middleware'

export function emitStatus(resources: any, resourceName: string): any {
  console.log('emitStatus: ', resourceName)

  const resourcesStatusPromises = resources.map((workload) =>
    getWorkloadStatus(`team-${workload.teamId}-${workload.name}`).then((status: any) => {
      return { [workload.name]: { status } }
    }),
  )

  Promise.all(resourcesStatusPromises).then((statuses) => {
    const resourcesStatus = Object.assign({}, ...statuses)
    getIo().emit(resourceName, resourcesStatus)
  })
}
