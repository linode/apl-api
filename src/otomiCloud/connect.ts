import axios from 'axios'

export default async function connect(apikey: string, clusterData: any): Promise<string | void> {
  const { name, provider, domainSuffix } = clusterData.cluster
  await axios({
    url: 'https://portal.otomi.cloud/api/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      query: `
        mutation Cluster {
          updateCluster(
            where: {key: "${apikey}"}
            data: {
              domainSuffix: {set: "${domainSuffix}"}
              name: {set: "${name}"}
              provider: {set: "${provider}"}
              status: {set: UP}
            }
            ) {
            id
            domainSuffix
            name
            provider
            region
            key
            status
          }
        }
    `,
    },
  }).catch((error) => {
    console.error('otomi cloud error: ', error.message)
  })

  return 'connected'
}
