import axios from 'axios'
import Debug from 'debug'

const debug = Debug('otomi:gitea-connect')
debug('NODE_ENV: ', process.env.NODE_ENV)

// get call to the api to retrieve all the commits
export default async function giteaCheckLatest(token: string, clusterData: any): Promise<any> {
  const domainSuffix: string | undefined = clusterData?.cluster?.domainSuffix
  const giteaUrl = `https://gitea.${domainSuffix}/api/v1/repos/otomi/values/commits`
  if (domainSuffix) {
    const response = await axios({
      url: giteaUrl,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
      },
    }).catch((error) => {
      debug('Gitea error: ', error.message)
    })

    return response
  }
}
