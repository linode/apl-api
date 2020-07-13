import dotEnv from 'dotenv'
import path from 'path'
import { HttpError, ProductsApi, ProjectReq, ProjectMember } from '@redkubes/harbor-client'
import OtomiStack from '../../otomi-stack'
import { HttpBasicAuth } from '@kubernetes/client-node'

dotEnv.config({ path: path.resolve(__dirname, '.env'), debug: true })
const env = process.env

const HarborRole = {
  admin: 1,
  developer: 2,
  guest: 3,
  master: 4,
}

const HarborGroupType = {
  ldap: 1,
  http: 2,
}

// console.log([env.HARBOR_USER, env.HARBOR_PASSWORD, env.HARBOR_BASE_URL])
async function main() {
  const api = new ProductsApi(env.HARBOR_BASE_URL)
  const auth = new HttpBasicAuth()
  auth.username = env.HARBOR_USER
  auth.password = env.HARBOR_PASSWORD
  api.setDefaultAuthentication(auth)

  const os = new OtomiStack()
  await os.init()

  const errors = []

  for await (const team of os.getTeams()) {
    try {
      const project: ProjectReq = {
        projectName: team.name,
        metadata: {},
      }
      console.log(`Creating a project for a team ${team.name}`)

      const res = await api.projectsPost(project)
      console.info(`Harbor client: ${JSON.stringify(res)}`)

      if (!res.response.headers.location) throw Error('Unable to obtain location header from response')
      // E.g.: location: "/api/v2.0/projects/6"
      const projectId = parseInt(res.response.headers.location.split('/').pop())

      const projMember: ProjectMember = {
        roleId: HarborRole.developer,
        memberGroup: {
          groupName: team.name,
          groupType: HarborGroupType.http,
        },
      }
      console.log(`Associating user group (${team.name}) with harbor project (${team.name})`)
      await api.projectsProjectIdMembersPost(projectId, projMember)
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
