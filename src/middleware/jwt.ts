/* eslint-disable no-param-reassign */
import { debug } from 'console'
import { RequestHandler } from 'express'
import { jwtDecode } from 'jwt-decode'
import { env } from 'process'
import { getMockEmail, getMockGroups, getMockName } from 'src/mocks'
import { JWT, OpenApiRequestExt, SessionUser } from 'src/otomi-models'
import { default as OtomiStack } from 'src/otomi-stack'
import { getSessionStack } from './session'

export function getUser(user: JWT, otomi: OtomiStack): SessionUser {
  const sessionUser: SessionUser = {
    ...user,
    teams: [],
    roles: [],
    isPlatformAdmin: false,
    isTeamAdmin: false,
    authz: {},
  }
  // keycloak does not (yet) give roles, so
  // for now we map correct group names to roles
  user?.groups?.forEach((group) => {
    if (['platform-admin', 'all-teams-admin'].includes(group)) {
      if (!sessionUser.roles.includes('platformAdmin')) {
        sessionUser.isPlatformAdmin = true
        sessionUser.roles.push('platformAdmin')
      }
    } else if (['team-admin'].includes(group)) {
      if (!sessionUser.roles.includes('teamAdmin')) {
        sessionUser.isTeamAdmin = true
        sessionUser.roles.push('teamAdmin')
      }
    } else if (!sessionUser.roles.includes('teamMember')) sessionUser.roles.push('teamMember')
    // if in team-(not admin), remove 'team-' prefix
    const teamId = group.substring(5)
    if (group.substring(0, 5) === 'team-' && !sessionUser.teams.includes(teamId)) {
      // we might be assigned team-* without that team yet existing in the values, so ignore those
      if (otomi.isLoaded) {
        const existing = otomi.repoService.getTeamConfig(teamId)
        if (existing) {
          sessionUser.teams.push(teamId)
        }
      }
    }
  })
  return sessionUser
}

export function jwtMiddleware(): RequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async function nextHandler(req: OpenApiRequestExt, res, next): Promise<any> {
    const token = req.header('Authorization')
    const otomi = await getSessionStack() // we can use the readonly version
    if (env.isDev) {
      req.user = getUser(
        {
          name: getMockName(),
          email: getMockEmail(),
          groups: getMockGroups(),
          roles: [],
          sub: 'mock-sub-value',
        },
        otomi,
      )
      return next()
    }
    if (!token) {
      debug('anonymous request')
      return next()
    }
    const retries = 3
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { name, email, roles, groups, sub } = jwtDecode<JWT>(token)
        req.user = getUser({ name, email, roles, groups, sub }, otomi)
        return next()
      } catch (error) {
        debug(`Error decoding JWT (attempt ${attempt}):`, error.message)
        if (attempt === retries) {
          return res.status(401).send({
            message: 'Unauthorized',
            error: `Failed to decode JWT after ${retries} attempts`,
          })
        }
      }
    }
  }
}
