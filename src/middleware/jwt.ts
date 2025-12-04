/* eslint-disable no-param-reassign */
import { debug } from 'console'
import { RequestHandler } from 'express'
import { jwtDecode } from 'jwt-decode'
import { getMockEmail, getMockGroups, getMockName } from 'src/mocks'
import { JWT, OpenApiRequestExt, SessionUser } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { cleanEnv } from 'src/validators'
import { getSessionStack } from './session'

const env = cleanEnv({})

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
        const exists = otomi.getTeamIds().includes(teamId)
        if (exists) {
          sessionUser.teams.push(teamId)
        }
      }
    }
  })
  return sessionUser
}

export function jwtMiddleware(): RequestHandler {
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
    try {
      const { name, email, roles, groups, sub } = jwtDecode<JWT>(token)
      req.user = getUser({ name, email, roles, groups, sub }, otomi)
      return next()
    } catch (error) {
      debug('JWT decode fails:', error.message)
      return res.status(401).send({
        message: 'Unauthorized',
        error: 'JWT decode fails',
      })
    }
  }
}
