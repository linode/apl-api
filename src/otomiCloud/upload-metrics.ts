import axios from 'axios'
import Debug from 'debug'

const debug = Debug('otomi:upload-metrics')
debug('NODE_ENV: ', process.env.NODE_ENV)

export default async function uploadMetrics(apikey: string, envType: string, metricsData: any): Promise<string | void> {
  const { coreValue, workerNodeCount, k8sVersion, otomiVersion, teams, services, workloads } = metricsData

  debug('Attempting to send metrics')

  await axios({
    // url: envType === 'dev' ? 'https://dev.portal.otomi.cloud/api/graphql' : 'https://portal.otomi.cloud/api/graphql',
    url: 'http://localhost:3000/api/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      query: `
        mutation createClusterInfo {
          createClusterInfo(
            data: {
              coreValue: ${coreValue}
              workerNodeCount: ${workerNodeCount}
              cluster: { connect: { key: "${apikey}" } }
              k8sVersion: "${k8sVersion}"
              otomiVersion: "${otomiVersion}"
              teams: ${teams}
              services: ${services}
              workloads: ${workloads}
            }
            ) {
            id
            readingTime
            cluster {
              id
              name
            }
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
  debug('Metrics send succesfully')
  return 'Metrics send succesfully'
}
