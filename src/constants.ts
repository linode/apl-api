import { TOOLS_HOST, cleanEnv } from './validators'

const env = cleanEnv({
  TOOLS_HOST,
})

export const BASEURL = `http://${env.TOOLS_HOST}:17771`
