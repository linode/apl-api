import { HttpError, ProductsApi, ProjectReq, ProjectMember } from '@redkubes/harbor-client'
import { HttpBasicAuth } from '@kubernetes/client-node'
import { cleanEnv, json, str } from 'envalid'

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
  const env = cleanEnv(
    process.env,
    {
      HARBOR_BASE_URL: str({ desc: 'A harbor core service URL' }),
      HARBOR_USER: str({ desc: 'A name of harbor admin user' }),
      HARBOR_PASSWORD: str({ desc: 'A password of harbor admin user' }),
      HARBOR_ADMIN_GROUP_NAME: str({ desc: 'A name of admin group' }),
      TEAM_NAMES: json({ desc: 'A list of team names in JSON format' }),
    },
    { strict: true },
  )
  const api = new ProductsApi(env.HARBOR_BASE_URL)
  const auth = new HttpBasicAuth()
  auth.username = env.HARBOR_USER
  auth.password = env.HARBOR_PASSWORD
  api.setDefaultAuthentication(auth)

  const errors = []

  for await (const team of env.TEAM_NAMES) {
    try {
      const project: ProjectReq = {
        projectName: team,
        metadata: {},
      }
      console.log(`Creating a project for a team ${team}`)

      const res = await api.projectsPost(project)
      console.info(`Harbor client: ${JSON.stringify(res)}`)

      if (!res.response.headers.location) throw Error('Unable to obtain location header from response')
      // E.g.: location: "/api/v2.0/projects/6"
      const projectId = parseInt(res.response.headers.location.split('/').pop())

      const projMember: ProjectMember = {
        roleId: HarborRole.developer,
        memberGroup: {
          groupName: team,
          groupType: HarborGroupType.http,
        },
      }
      const projAdminMember: ProjectMember = {
        roleId: HarborRole.admin,
        memberGroup: {
          groupName: env.HARBOR_ADMIN_GROUP_NAME,
          groupType: HarborGroupType.http,
        },
      }
      console.log(`Associating user group (${team}) with harbor project (${team})`)
      await api.projectsProjectIdMembersPost(projectId, projMember)
      await api.projectsProjectIdMembersPost(projectId, projAdminMember)
    } catch (e) {
      if (e instanceof HttpError) {
        if (e.statusCode === 409) {
          console.info(`Project already exists for team ${team}. Skipping.`)
          continue
        } else {
          console.error(`Harbor client, ${JSON.stringify(e.response)}`)
        }
      } else console.error('Harbor client: ', e)
      errors.push(`Error while creating harbor project for '${team}' team`)
    }
  }

  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2))
    process.exit(1)
  }
}
main()
