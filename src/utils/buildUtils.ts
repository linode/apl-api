import axios from 'axios'
import { OtomiError } from 'src/error'

const axiosInstance = (adminUsername, adminPassword, domainSuffix) =>
  axios.create({
    baseURL: `https://gitea.${domainSuffix}/api/v1`,
    auth: {
      username: adminUsername,
      password: adminPassword,
    },
  })

export async function getGiteaRepoUrls(adminUsername, adminPassword, orgName, domainSuffix) {
  try {
    const repoNames = new Set<string>()
    const orgResponse = await axiosInstance(adminUsername, adminPassword, domainSuffix).get(`/orgs/${orgName}/repos`)
    orgResponse.data.forEach((repo) => repoNames.add(repo.full_name as string))

    const users = await axiosInstance(adminUsername, adminPassword, domainSuffix).get('/admin/users')
    const usernames = users.data.map((user) => user.username)
    for (const username of usernames) {
      const response = await axiosInstance(adminUsername, adminPassword, domainSuffix).get(`/users/${username}/repos`)
      response.data.forEach((repo) => repoNames.add(repo.full_name as string))
    }
    // filter out values, charts and team-<teamId>-argocd repositories
    const regex = new RegExp(`^${orgName}\\/team-[\\w-]+-argocd$`)
    const filteredRepoNames = Array.from(repoNames).filter(
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
