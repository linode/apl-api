import { str, bool, json, cleanEnv as clean } from 'envalid'

export const GIT_REPO_URL = str({ desc: 'The git repo url', default: 'github.com/redkubes/otomi-values-demo.git' })
export const GIT_LOCAL_PATH = str({ desc: 'The local file path to the repo', default: '/tmp/otomi-stack' })
export const GIT_BRANCH = str({ desc: 'The git repo branch', default: 'master' })
export const GIT_USER = str({ desc: 'The git username' })
export const GIT_PASSWORD = str({ desc: 'The git password' })
export const GIT_EMAIL = str({ desc: 'The git user email' })
export const DB_PATH = str({ desc: 'The file path to the db. If not given in-memory db is used.', default: undefined })
export const CLUSTER_ID = str({ desc: 'The cluster id', default: 'google/dev' })
export const CLUSTER_NAME = str({ desc: 'The cluster name', default: 'dev' })
export const CLUSTER_APISERVER = str({ desc: 'The cluster api server ip/host' })
export const DISABLE_SYNC = bool({ desc: 'Wether to disable pushing to the repo', default: false })
export const TENANT_ID = str({ desc: 'The tenant ID' })
export const TENANT_CLIENT_ID = str({ desc: 'The tenant client id' })
export const TENANT_CLIENT_SECRET = str({ desc: 'The tenant client secret' })
export const IDP_ALIAS = str({ desc: 'An alias for the IDP' })
export const REDIRECT_URIS = json({ desc: "A list of redirect URI's in JSON format" })
export const IDP_GROUP_OTOMI_ADMIN = str({ desc: 'Otomi admin group name' })
export const IDP_GROUP_MAPPINGS_TEAMS = json({ desc: 'A list of team names mapping to group IDs from the IDP' })
export const IDP_OIDC_URL = str({ desc: "The IDP's OIDC enpoints url" })
export const KEYCLOAK_ADMIN = str({ desc: 'Default admin username for KeyCloak Server' })
export const KEYCLOAK_ADMIN_PASSWORD = str({ desc: 'Default password for admin' })
export const KEYCLOAK_ADDRESS = str({ desc: 'The Keycloak Server address' })
export const KEYCLOAK_CLIENT_SECRET = str({ desc: 'The keycloak client secret' })
export const KEYCLOAK_REALM = str({ desc: 'The Keycloak Realm' })
export const TOOLS_HOST = str({ desc: 'The host of the tools server', default: '127.0.0.1' })

export const cleanEnv = (env, validators, options) => {
  if (env.NODE_ENV === 'test') return env
  else return clean(env, validators, options)
}
