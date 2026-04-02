import { TOOLS_HOST, cleanEnv } from './validators'

const env = cleanEnv({
  TOOLS_HOST,
})

export const BASEURL = `http://${env.TOOLS_HOST}:17771`

export const APL_SECRETS_NAMESPACE = 'apl-secrets'
export const APL_USERS_NAMESPACE = 'apl-users'
export const PLATFORM_SECRETS_NAME = 'otomi-secrets'
