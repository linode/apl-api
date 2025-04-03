import axios from 'axios'
import Debug from 'debug'
import { cleanEnv, GIT_REPO_URL } from 'src/validators'

const debug = Debug('otomi:gitea-connect')

const env = cleanEnv({
  GIT_REPO_URL,
})

// get call to the api to retrieve all the commits
export default async function giteaCheckLatest(token: string): Promise<any> {
  // Extracts "http://gitea-http.gitea.svc.cluster.local:3000" or "https://gitea.<domainSuffix>"
  const baseDomain = new URL(env.GIT_REPO_URL).origin
  const giteaUrl = `${baseDomain}/api/v1/repos/otomi/values/commits`
  if (baseDomain) {
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
