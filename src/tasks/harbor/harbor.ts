import dotEnv from 'dotenv'
import path from 'path'
import { HttpError, ProductsApi, ProjectReq } from '@redkubes/harbor-client'
import OtomiStack from '../../otomi-stack'
import { HttpBasicAuth } from '@kubernetes/client-node'

dotEnv.config({ path: path.resolve(__dirname, '.env'), debug: true })
const env = process.env

// console.log([env.HARBOR_USER, env.HARBOR_PASSWORD, env.HARBOR_BASE_URL])
async function main() {
  const api = new ProductsApi(env.HARBOR_BASE_URL)
  const auth = new HttpBasicAuth()
  // FIXME there is an authentication issues, somehow a user is not authenticated thus HTTP 401
  auth.username = env.HARBOR_USER
  auth.password = env.HARBOR_PASSWORD
  api.setDefaultAuthentication(auth)

  // const auth = new HttpBasicAuth(env.HARBOR_USER, env.HARBOR_PASSWORD)
  // api.setDefaultAuthentication(auth)
  const os = new OtomiStack()
  await os.init()

  const errors = []
  try {
    const res = await api.projectsGet()
    console.log(res.body)
  } catch (e) {
    console.error(`Harbor client: ${JSON.stringify(e)}`)
  }

  for await (const team of os.getTeams()) {
    try {
      const project: ProjectReq = {
        projectName: team.name,
        metadata: {},
      }
      console.log(`Creating a project for a team ${team.name}`)
      await api.projectsPost(project)
    } catch (e) {
      if (e instanceof HttpError) {
        if (e.statusCode === 409) {
          console.info(`Project already exists for team ${team.name}. Skipping.`)
          continue
        } else console.error(`Harbor client: ${JSON.stringify(e.response)}`)
      } else console.error('Harbor client: ', e)
      errors.push(`Error while creating harbor project for '${team.name}' team`)
    }
  }

  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2))
    process.exit(1)
  }
}
main()
