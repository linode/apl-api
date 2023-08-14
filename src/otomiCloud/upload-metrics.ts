import axios from 'axios'
import Debug from 'debug'

const debug = Debug('otomi:upload-metrics')
debug('NODE_ENV: ', process.env.NODE_ENV)

export default async function uploadMetrics(apikey: string, envType: string, metricsData: any): Promise<string | any> {
  const { workerNodeCount, k8sVersion, otomiVersion, teams, services, workloads } = metricsData

  debug('Attempting to send metrics')

  const response = await axios({
    url: envType === 'dev' ? 'https://dev.portal.otomi.cloud/api/graphql' : 'https://portal.otomi.cloud/api/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      query: `
        mutation createClusterInfo {
          createClusterInfo(
            data: {
              workerNodeCount: ${workerNodeCount}
              cluster: { connect: { key: "${apikey}" } }
              k8sVersion: "${k8sVersion}"
              otomiVersion: "${otomiVersion}"
              teams: ${teams}
              services: ${services}
              workloads: ${workloads}
            }
            ) {
            readingTime
            teams
            services
            workloads
          }
        }
    `,
    },
  }).catch((error) => {
    debug('Otomi cloud error: ', error.message)
  })
  if (response) debug('Metrics send succesfully')
  return response
}
