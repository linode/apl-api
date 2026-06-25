export const APL_SECRETS_NAMESPACE = 'apl-secrets'
export const APL_USERS_NAMESPACE = 'apl-users'
export const PLATFORM_SECRETS_NAME = 'otomi-secrets'
export const GITEA_SECRETS_NAME = 'gitea-secrets'
export const GIT_DEFAULT_CONFIG = {
  repoUrl: 'http://git-server.git-server.svc.cluster.local/otomi/values.git',
  branch: 'main',
  email: 'pipeline@cluster.local',
}
export const GIT_LEGACY_CONFIG = {
  repoUrl: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
}
