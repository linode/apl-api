import axios from 'axios'

export default async function giteaCheckLatest(token: string, clusterData: any): Promise<any> {
  const domainSuffix: string | undefined = clusterData?.cluster?.domainSuffix
  console.log('domain', domainSuffix)
  if (domainSuffix) {
    const response = await axios({
      url: `https://gitea.${domainSuffix}/api/v1/repos/otomi/values/commits`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
      },
    }).catch((error) => {
      console.error('gitea error: ', error.message)
    })

    return response
  }
}
