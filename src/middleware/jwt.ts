/* eslint-disable no-param-reassign */
import { debug } from 'console'
import { RequestHandler } from 'express'
import jwtDecode from 'jwt-decode'
import { getMockEmail, getMockGroups, getMockName } from 'src/mocks'
import { JWT, OpenApiRequestExt, User } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { cleanEnv } from 'src/validators'
import { getSessionStack } from './session'

const env = cleanEnv({})

export function getUser(user: JWT, otomi: OtomiStack): User {
  const sessionUser: User = { ...user, teams: [], roles: [], isAdmin: false, authz: {} }
  // keycloak does not (yet) give roles, so
  // for now we map correct group names to roles
  user.groups.forEach((group) => {
    if (['admin', 'team-admin'].includes(group)) {
      if (!sessionUser.roles.includes('admin')) {
        sessionUser.isAdmin = true
        sessionUser.roles.push('admin')
      }
    } else if (!sessionUser.roles.includes('team')) sessionUser.roles.push('team')
    // if in team-(not admin), remove 'team-' prefix
    const teamId = group.substring(5)
    if (group.substring(0, 5) === 'team-' && group !== 'team-admin' && !sessionUser.teams.includes(teamId)) {
      // we might be assigned team-* without that team yet existing in the values, so ignore those
      const existing = otomi.db.getItemReference('teams', { id: teamId }, false)
      if (existing) sessionUser.teams.push(teamId)
    }
  })

  return sessionUser
}

export function jwtMiddleware(): RequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async function nextHandler(req: OpenApiRequestExt, res, next): Promise<any> {
    const token = req.header('Authorization')
    console.log('jwtMiddleware token:', token)
    const otomi = await getSessionStack() // we can use the readonly version
    if (env.isDev) {
      req.user = getUser(
        {
          name: getMockName(),
          email: getMockEmail(),
          groups: getMockGroups(),
          roles: [],
        },
        otomi,
      )
      return next()
    }
    if (!token) {
      debug('anonymous request')
      return next()
    }
    const { name, email, roles, groups } = jwtDecode(token)
    req.user = getUser({ name, email, roles, groups }, otomi)
    return next()
  }
}
