import axios, { AxiosInstance } from 'axios'

export const GITEA_INTERNAL_API_URL = 'http://gitea-http.gitea.svc.cluster.local:3000/api/v1'
const PAGE_SIZE = 50
// Built-in Gitea accounts that must never be deleted
const PROTECTED_GITEA_USERNAMES: readonly string[] = ['admin', 'otomi-admin']
// Service accounts the Gitea operator creates per organization: organization-team-<teamId> and organization-otomi
const ORGANIZATION_SERVICE_ACCOUNT_PREFIX = 'organization-'

export function isProtectedGiteaUser(username: string, adminUsername: string): boolean {
  const name = username.toLowerCase()
  return (
    PROTECTED_GITEA_USERNAMES.includes(name) ||
    name === adminUsername.toLowerCase() ||
    name.startsWith(ORGANIZATION_SERVICE_ACCOUNT_PREFIX)
  )
}

export interface GiteaUser {
  username: string
  email: string
}

export interface GiteaAdminClient {
  listUsers(): Promise<GiteaUser[]>
  listUserRepos(username: string): Promise<string[]>
  deleteUser(username: string): Promise<void>
}

async function listAllPages<T>(api: AxiosInstance, path: string): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const { data } = await api.get<T[]>(path, { params: { page, limit: PAGE_SIZE } })
    items.push(...data)
    if (data.length < PAGE_SIZE) return items
  }
}

export function createGiteaAdminClient(
  username: string,
  password: string,
  baseURL = GITEA_INTERNAL_API_URL,
): GiteaAdminClient {
  const api = axios.create({ baseURL, auth: { username, password }, timeout: 30000 })
  return {
    async listUsers() {
      const users = await listAllPages<{ login: string; email: string }>(api, '/admin/users')
      return users.map(({ login, email }) => ({ username: login, email }))
    },
    async listUserRepos(owner) {
      const repos = await listAllPages<{ full_name: string; owner: { login: string } }>(
        api,
        `/users/${encodeURIComponent(owner)}/repos`,
      )
      // Only report personal repositories: the ones purge will delete
      return repos.filter((repo) => repo.owner?.login === owner).map((repo) => repo.full_name)
    },
    async deleteUser(name) {
      // purge deletes the user's own repositories; organization repositories are not touched
      await api.delete(`/admin/users/${encodeURIComponent(name)}`, { params: { purge: true } })
    },
  }
}

export function giteaErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const apiMessage = (err.response?.data as { message?: string } | undefined)?.message
    return apiMessage ?? err.message
  }
  return err instanceof Error ? err.message : String(err)
}
