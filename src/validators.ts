import { bool, CleanedEnvAccessors, cleanEnv as clean, num, str, ValidatorSpec } from 'envalid'

export const AUTHZ_MOCK_IS_ADMIN = bool({
  desc: 'Indicate if a mocked user is an admin',
  default: true,
})
export const AUTHZ_MOCK_TEAM = str({ desc: 'Comma separated list of teams a user belongs to', default: undefined })
export const CORE_VERSION = str({ desc: 'The otomi-core version', default: 'x.x.x' })
export const CUSTOM_ROOT_CA = str({ desc: 'The root CA used for certs', default: undefined })
// export const DRONE_SHARED_SECRET = str({ desc: 'The drone secret to validate incoming webhooks' })
export const EDITOR_INACTIVITY_TIMEOUT = num({
  desc: 'Inactivity timeout in days after which editor session is removed to clean mem',
  default: 1,
})
export const GIT_BRANCH = str({ desc: 'The git repo branch', default: 'main' })
export const GIT_EMAIL = str({ desc: 'The git user email', default: 'not@us.ed' })
export const GIT_LOCAL_PATH = str({
  desc: 'The local file path to the repo',
  default: '/tmp/otomi/values/main',
})
export const GIT_PASSWORD = str({ desc: 'The git password' })
export const GIT_REPO_URL = str({ desc: 'The git repo url', devDefault: undefined })
export const GIT_USER = str({ desc: 'The git username' })
export const OIDC_ENDPOINT = str()
export const REGION = str({ desc: 'The cloud region' })
export const ROARR_LOG = bool({ desc: 'To enable Lightship logs', default: false })
export const TOOLS_HOST = str({ desc: 'The host of the tools server', default: '127.0.0.1' })
const { env } = process
export function cleanEnv<T>(
  validators: { [K in keyof T]: ValidatorSpec<T[K]> },
  options: any = { strict: true },
): Readonly<T & CleanedEnvAccessors> {
  if (env.NODE_ENV === 'test') {
    env.GIT_EMAIL = 'testUser@redkubes.com'
    env.GIT_USER = 'testUser'
    env.GIT_PASSWORD = 'testUserPassword'
    env.GIT_LOCAL_PATH = 'test'
  }
  return clean(env, validators, options)
}
