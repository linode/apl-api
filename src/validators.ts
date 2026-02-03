import { bool, cleanEnv as clean, CleanOptions, json, num, str, ValidatorSpec } from 'envalid'

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
export const SSO_ISSUER = str({
  desc: 'Expected JWT issuer URL',
  example: 'https://keycloak.example.com/realms/otomi',
  devDefault: 'https://keycloak.example.com/realms/otomi',
})
export const SSO_JWKS_URI = str({
  desc: 'Expected JWT issuer URL',
  example: 'https://keycloak.example.com/realms/otomi/protocol/openid-connect/certs',
  devDefault: 'https://keycloak.example.com/realms/otomi/protocol/openid-connect/certs',
})
export const JWT_AUDIENCE = str({
  desc: 'Expected JWT audience',
  example: 'otomi',
  default: 'otomi',
})
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
export const REGION = str({ desc: 'The cloud region' })
export const ROARR_LOG = bool({ desc: 'To enable Lightship logs', default: false })
export const TOOLS_HOST = str({ desc: 'The host of the tools server', default: '127.0.0.1' })
export const PREINSTALLED_EXCLUDED_APPS = json({
  desc: 'Applications that are managed by Linode, so they should be excluded from the apps page',
  default: {
    apps: ['cert-manager', 'external-dns'],
  },
})
export const HIDDEN_APPS = json({
  desc: 'Applications that are hidden from the apps page',
  default: {
    apps: [''],
  },
})
export const OBJ_STORAGE_APPS = json({
  desc: 'Applications',
  default: [
    { appId: 'harbor', required: false },
    { appId: 'loki', required: false },
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
export const PIPELINE_NAME = str({
  desc: 'The name of the current pipeline',
  default: 'doc-ingest-pipeline',
})
export const KNOWLEDGE_BASE_API_VERSION = str({
  desc: 'The API version for AkamaiKnowledgeBase custom resources',
  default: 'akamai.io/v1alpha1',
})
export const KNOWLEDGE_BASE_KIND = str({
  desc: 'The kind for AkamaiKnowledgeBase custom resources',
  default: 'AkamaiKnowledgeBase',
})
export const DATABASE_API_VERSION = str({
  desc: 'The API version for PostgreSQL Database custom resources',
  default: 'postgresql.cnpg.io/v1',
})
export const DATABASE_KIND = str({
  desc: 'The kind for PostgreSQL Database custom resources',
  default: 'Database',
})
export const DB_OWNER = str({
  desc: 'The owner for PostgreSQL Database custom resources',
  default: 'app',
})
export const EMBED_DIM_DEFAULT = num({
  desc: 'Default embedding dimension if not specified by the model',
  default: 1536,
})
export const EMBED_BATCH_SIZE = num({
  desc: 'Batch size for embedding processing',
  default: 10,
})
export const AGENT_API_VERSION = str({
  desc: 'The API version for AkamaiAgent custom resources',
  default: 'akamai.io/v1alpha1',
})
export const AGENT_KIND = str({
  desc: 'The kind for AkamaiAgent custom resources',
  default: 'AkamaiAgent',
})
export const STARTUP_RETRY_COUNT = num({
  desc: 'Number of retries for startup dependencies (JWKS, tools server)',
  default: 300,
})
export const STARTUP_RETRY_INTERVAL_MS = num({
  desc: 'Retry interval in milliseconds for startup dependencies',
  default: 1000,
})
export const RATE_LIMIT_WINDOW_MS = num({
  desc: 'Rate limiting time window in milliseconds',
  default: 300000, // 5 minutes
})
export const RATE_LIMIT_MAX_REQUESTS = num({
  desc: 'Maximum number of requests per IP per time window for general API rate limiting',
  default: 2000,
})
export const RATE_LIMIT_AUTH_MAX_ATTEMPTS = num({
  desc: 'Maximum number of failed authentication attempts per IP per time window',
  default: 500,
})
export const TRUST_PROXY = num({
  desc: 'Number of reverse proxies to trust for client IP detection (0 to disable, 1 for Kubernetes Ingress, 2 for LB + Ingress)',
  default: 2,
  devDefault: 0,
})
const { env } = process
export function cleanEnv<T>(validators: { [K in keyof T]: ValidatorSpec<T[K]> }, options: CleanOptions<T> = {}) {
  if (env.NODE_ENV === 'test') {
    env.GIT_EMAIL = 'testUser@redkubes.com'
    env.GIT_USER = 'testUser'
    env.GIT_PASSWORD = 'testUserPassword'
  }
  return clean(env, validators, options)
}
