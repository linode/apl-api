const dotEnv = require('dotenv')
const server = require('./server');
const otomi = require('./otomi-stack')


dotEnv.config()

const otomiStack = new otomi.OtomiStack(process.env.OTOMI_STACK_PATH, "azure")
const app = server.initApp(otomiStack)
app.listen(process.env.PORT);
