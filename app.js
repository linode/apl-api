const dotEnv = require('dotenv')
const dataProvider = require('./data-provider')
const server = require('./server');

dotEnv.config()
const provider = new dataProvider.DataProvider()
const app = server.initApp(__dirname, provider)
app.listen(process.env.PORT);
