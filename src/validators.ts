import { str, bool, cleanEnv as clean, CleanEnv, StrictCleanOptions, ValidatorSpec } from 'envalid'

export const CORE_VERSION = str({ desc: 'The otomi-core version', default: 'x.x.x' })
export const CUSTOM_ROOT_CA = str({ desc: 'The root CA used for certs', default: undefined })
export const DB_PATH = str({ desc: 'The file path to the db. If not given in-memory db is used.', default: undefined })
export const DISABLE_SYNC = bool({ desc: 'Will disable pushing to the repo', default: false })
export const GIT_BRANCH = str({ desc: 'The git repo branch', default: 'main' })
export const GIT_EMAIL = str({ desc: 'The git user email', default: 'not@us.ed' })
export const GIT_LOCAL_PATH = str({ desc: 'The local file path to the repo', default: '/tmp/otomi-values' })
export const GIT_PASSWORD = str({ desc: 'The git password' })
export const GIT_REPO_URL = str({ desc: 'The git repo url', default: 'github.com/redkubes/otomi-values-demo.git' })
export const GIT_USER = str({ desc: 'The git username' })
export const NO_AUTHZ = bool({ desc: 'Will disable authorization in the middleware', default: false })
export const OIDC_ENDPOINT = str()
export const REGION = str({ desc: 'The cloud region' })
export const TOOLS_HOST = str({ desc: 'The host of the tools server', default: '127.0.0.1' })
const { env } = process
export function cleanEnv<T>(
  validators: { [K in keyof T]: ValidatorSpec<T[K]> },
  options: StrictCleanOptions = { strict: true },
): Readonly<T> & CleanEnv & { readonly [varName: string]: string | undefined } {
  if (env.NODE_ENV === 'test') {
    env.GIT_EMAIL = 'testUser@redkubes.com'
    env.GIT_USER = 'testUser'
    env.GIT_PASSWORD = 'testUserPassword'
    env.GIT_LOCAL_PATH = 'test'
  }
  return clean(env, validators, options) as Readonly<T> & CleanEnv & { readonly [varName: string]: string | undefined }
}
