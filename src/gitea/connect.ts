import axios from 'axios'

export default async function giteaCheckLatest(token: string, clusterData: any): Promise<string | void> {
  const domainSuffix: string | undefined = clusterData?.cluster?.domainSuffix
  // let domainSuffix: string = os.networkInterfaces().lo0![0].address
  // if (env.NODE_ENV === 'development') domainSuffix = ''
  console.log('domain', domainSuffix)
  if (domainSuffix) {
    await axios({
      url: `https://gitea.${domainSuffix}.nip.io/api/v1/repos/otomi/values`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
      },
    })
      .then((response) => {
        console.log('res', response)
        return response
      })
      .catch((error) => {
        console.error('gitea error: ', error.message)
      })
  }
}
