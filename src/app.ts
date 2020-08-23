import initApp from './server'
import OtomiStack from './otomi-stack'
import { setSignalHandlers } from './utils'
import { cleanEnv, str, bool } from 'envalid'

console.log('NODE_ENV: ', process.env.NODE_ENV)
export const env = cleanEnv(
  process.env,
  {
    GIT_REPO_URL: str({ desc: 'The git repo url' }),
    GIT_LOCAL_PATH: str({ desc: 'The local file path to the repo', default: '/tmp/otomi-stack' }),
    GIT_BRANCH: str({ desc: 'The git repo branch', default: 'master' }),
    GIT_USER: str({ desc: 'The git username' }),
    GIT_PASSWORD: str({ desc: 'The git password' }),
    GIT_EMAIL: str({ desc: 'The git user email' }),
    DB_PATH: str({ desc: 'The file path to the db. If not given in-memory db is used.', default: undefined }),
    CLUSTER_ID: str({ desc: 'The cluster id' }),
    CLUSTER_NAME: str({ desc: 'The cluster name' }),
    CLUSTER_APISERVER: str({ desc: 'The cluster api server ip/host' }),
    TOOLS_HOST: str({ desc: 'The host of the tools server', default: '127.0.0.1' }),
    DISABLE_SYNC: bool({ desc: 'Wether to disable pushing to the repo', default: false }),
  },
  { strict: true },
)

const otomiStack = new OtomiStack()

otomiStack.init().then(async (status) => {
  if (!status) {
    console.info('Exiting')
    process.exit(1)
  }
  const app = await initApp(otomiStack)
  console.info('Listening on port: http://127.0.0.1:8080')
  const srv = app.listen(8080)
  setSignalHandlers(srv)
})
