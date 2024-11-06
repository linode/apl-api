import axios from 'axios'
import { OtomiError } from 'src/error'

export async function getGiteaRepoUrls(username, password, orgName, domainSuffix) {
  try {
    const response = await axios.get(`https://gitea.${domainSuffix}/api/v1/orgs/${orgName}/repos`, {
      auth: {
        username,
        password,
      },
    })
    const repoNames = response.data.map((repo) => repo.name)
    const filteredRepoNames = repoNames.filter(
      (item: string) => item !== 'values' && item !== 'charts' && !/^team-\w+-argocd$/.test(item),
    )
    const giteaRepoUrls = filteredRepoNames.map(
      (name: string) => `https://gitea.${domainSuffix}/${orgName}/${name}.git`,
    )
    return giteaRepoUrls
  } catch (err) {
    console.log('err', err)
    const error = new OtomiError('Error getting internal repository names')
    error.code = 500
    error.publicMessage = 'Error getting internal repository names'
    throw error
  }
}
