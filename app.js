const dotEnv = require('dotenv')
const db = require('./src/db')
const server = require('./src/server')
const otomi = require('./src/otomi-stack')
const utils = require('./src/utils')
const repo = require('./src/repo')

dotEnv.config()
utils.validateConfig()

const d = db.init(process.env.DB_PATH)
const r = repo.init(
  process.env.GIT_LOCAL_PATH,
  process.env.GIT_REPO_URL,
  process.env.GIT_USER,
  process.env.GIT_EMAIL,
  process.env.GIT_PASSWORD,
  process.env.GIT_BRANCH,
)

const otomiStack = new otomi.OtomiStack(r, d)

otomiStack.init().then((status) => {
  if (!status) {
    console.info('Exiting')
    process.exit(1)
  }
  const app = server.initApp(otomiStack)
  console.info('Listening on port: 8080')
  const srv = app.listen(8080)
  utils.setSignalHandlers(srv)
})
