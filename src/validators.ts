import { bool, CleanedEnvAccessors, cleanEnv as clean, CleanOptions, json, num, str, ValidatorSpec } from 'envalid'

export const AUTHZ_MOCK_IS_PLATFORM_ADMIN = bool({
  desc: 'Indicate if a mocked user is a platform admin',
  default: true,
})
export const AUTHZ_MOCK_IS_TEAM_ADMIN = bool({
  desc: 'Indicate if a mocked user is a team admin',
  default: true,
})
export const AUTHZ_MOCK_TEAM = str({ desc: 'Comma separated list of teams a user belongs to', default: undefined })
export const DEFAULT_PLATFORM_ADMIN_EMAIL = str({
  desc: 'The email address for the default platform admin user.',
  devDefault: 'platform-admin@dev.linode-apl.net',
})
export const VERSIONS = json({
  desc: 'The versions of the otomi components',
  default: {
    api: process.env.npm_package_version,
    console: 'x.x.x',
    core: 'x.x.x',
  },
})
export const CUSTOM_ROOT_CA = str({ desc: 'The root CA used for certs', default: undefined })
export const DRONE_WEBHOOK_SECRET = str({ desc: 'The drone secret to validate incoming webhooks', default: undefined })
export const EDITOR_INACTIVITY_TIMEOUT = num({
  desc: 'Inactivity timeout in days after which editor session is removed to clean mem',
  default: 1,
})
export const GIT_BRANCH = str({ desc: 'The git repo branch', default: 'main' })
export const CHECK_LATEST_COMMIT_INTERVAL = num({
  desc: 'Interval in minutes for how much time in between each gitea latest commit check',
  default: 2,
})
export const GIT_EMAIL = str({ desc: 'The git user email', default: 'not@us.ed' })
export const GIT_LOCAL_PATH = str({
  desc: 'The local file path to the repo',
  default: '/tmp/otomi/values/main',
})
export const GIT_PASSWORD = str({ desc: 'The git password' })
export const GIT_REPO_URL = str({
  desc: 'The git repo url',
  devDefault: `file://${process.env.HOME}/workspace/linode/values-ofld1`,
})
export const GIT_USER = str({ desc: 'The git username' })
export const HELM_CHART_CATALOG = str({
  desc: 'The helm chart catalog',
  devDefault: 'https://github.com/linode/apl-charts.git',
})
export const GIT_PROVIDER_URL_PATTERNS = json({
  desc: 'Regular expressions to match and extract information from URLs of supported git providers (GitHub, GitLab, Bitbucket) for cloning Helm charts.',
  default: {
    github: 'github\\.com\\/([^\\/]+)\\/([^\\/]+)\\/(?:blob|raw)\\/([^\\/]+)\\/(.+)',
    gitlab: 'gitlab\\.com\\/([^\\/]+)\\/([^\\/]+)(?:\\/([^\\/]+))?\\/(?:\\-\\/(?:blob|raw))\\/([^\\/]+)\\/(.+)',
    bitbucket: 'bitbucket\\.org\\/([^\\/]+)\\/([^\\/]+)\\/(?:src|raw)\\/([^\\/]+)\\/(.+)',
  },
})
export const OIDC_ENDPOINT = str()
export const REGION = str({ desc: 'The cloud region' })
export const ROARR_LOG = bool({ desc: 'To enable Lightship logs', default: false })
export const TOOLS_HOST = str({ desc: 'The host of the tools server', default: '127.0.0.1' })
export const PREINSTALLED_EXCLUDED_APPS = json({
  desc: 'Applications that are managed by Linode, so they should be excluded from the apps page',
  default: {
    apps: ['cert-manager', 'minio', 'kured', 'velero', 'drone', 'external-dns'],
  },
})
export const OBJ_STORAGE_APPS = json({
  desc: 'Applications',
  default: [
    { appId: 'harbor', required: false },
    { appId: 'loki', required: false },
    { appId: 'tempo', required: true },
    { appId: 'velero', required: true },
    { appId: 'thanos', required: true },
    { appId: 'kubeflow-pipelines', required: true },
  ],
})
export const ROOT_KEYCLOAK_USER = str({
  desc: 'The default username for the root keycloak user for administrative purposes.',
  default: 'otomi-admin',
})
export const EXPRESS_PAYLOAD_LIMIT = str({
  desc: 'The express payload limit',
  default: '500kb',
})
export const GIT_PUSH_RETRIES = num({
  desc: 'Amount of retries we do to push and pull in the git save function',
  default: 12,
})
const { env } = process
export function cleanEnv<T>(
  validators: { [K in keyof T]: ValidatorSpec<T[K]> },
  options: CleanOptions<T> = {},
): Readonly<T & CleanedEnvAccessors> {
  if (env.NODE_ENV === 'test') {
    env.GIT_EMAIL = 'testUser@redkubes.com'
    env.GIT_USER = 'testUser'
    env.GIT_PASSWORD = 'testUserPassword'
  }
  return clean(env, validators, options)
}
