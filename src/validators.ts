import { str, bool, cleanEnv as clean, CleanEnv, StrictCleanOptions, ValidatorSpec } from 'envalid'

export const CLUSTER_APISERVER = str({ desc: 'The cluster api server ip/host', default: 'http://127.0.0.1:8080' })
export const CLUSTER_ID = str({ desc: 'The cluster id', default: 'google/dev' })
export const CLUSTER_NAME = str({ desc: 'The cluster name', default: 'dev' })
export const CORE_VERSION = str({ desc: 'The otomi-core version', default: 'x.x.x' })
export const DB_PATH = str({ desc: 'The file path to the db. If not given in-memory db is used.', default: undefined })
export const DISABLE_SYNC = bool({ desc: 'Whether to disable pushing to the repo', default: false })
export const GIT_BRANCH = str({ desc: 'The git repo branch', default: 'main' })
export const GIT_EMAIL = str({ desc: 'The git user email' })
export const GIT_LOCAL_PATH = str({ desc: 'The local file path to the repo', default: '/tmp/otomi-values' })
export const GIT_PASSWORD = str({ desc: 'The git password' })
export const GIT_REPO_URL = str({ desc: 'The git repo url', default: 'github.com/redkubes/otomi-values-demo.git' })
export const GIT_USER = str({ desc: 'The git username' })
export const NO_AUTHZ = bool({ desc: 'Whether to disable authorization in the middleware', default: false })
export const OIDC_ENDPOINT = str()
export const REGION = str({ desc: 'The cloud region' })
export const TOOLS_HOST = str({ desc: 'The host of the tools server', default: '127.0.0.1' })
export const USE_SOPS = bool({ desc: 'Whether to use encryption', default: true })
const { env } = process
export function cleanEnv<T>(
  validators: { [K in keyof T]: ValidatorSpec<T[K]> },
  options: StrictCleanOptions = { strict: true },
): Readonly<T> & CleanEnv & { readonly [varName: string]: string | undefined } {
  if (env.NODE_ENV === 'test') {
    process.env.USE_SOPS = 'false'
    process.env.GIT_EMAIL = 'testUser@redkubes.com'
    process.env.GIT_USER = 'testUser'
    process.env.GIT_PASSWORD = 'testUserPassword'
  }
  return clean(env, validators, options) as Readonly<T> & CleanEnv & { readonly [varName: string]: string | undefined }
}
