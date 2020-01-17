const dotEnv = require('dotenv')
const db = require('./src/db')
const server = require('./src/server');
const otomi = require('./src/otomi-stack')
const utils = require('./src/utils')
const repo = require('./src/repo')

dotEnv.config()
utils.validateConfig();

const r = repo(process.env.GIT_LOCAL_PATH)
const d = db.init(process.env.DB_PATH)

const otomiStack = new otomi.OtomiStack(r, d)
const app = server.initApp(otomiStack)
console.info("Listening on port: 8080")
app.listen(8080);
