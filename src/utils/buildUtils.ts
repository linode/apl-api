import axios from 'axios'
import { OtomiError } from 'src/error'

export async function getGiteaRepoUrls(username, password, orgName, domainSuffix) {
  try {
    const response = await axios.get(`https://gitea.${domainSuffix}/api/v1/user/repos`, {
      auth: {
        username,
        password,
      },
    })
    const repoNames = response.data.map((repo) => repo.full_name)
    // filter out values, charts and team-<teamId>-argocd repositories
    const regex = new RegExp(`^${orgName}\\/team-[\\w-]+-argocd$`)
    const filteredRepoNames = repoNames.filter(
      (item: string) => item !== `${orgName}/values` && item !== `${orgName}/charts` && !regex.test(item),
    )
    const giteaRepoUrls = filteredRepoNames.map((name: string) => `https://gitea.${domainSuffix}/${name}.git`)
    return giteaRepoUrls
  } catch (err) {
    console.log('err', err)
    const error = new OtomiError('Error getting internal repository names')
    error.code = 500
    error.publicMessage = 'Error getting internal repository names'
    throw error
  }
}
