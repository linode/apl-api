import { HttpError } from 'src/error'
import { SessionUser } from 'src/otomi-models'

export function assertNamespaceAccess(namespace: string, user: SessionUser): void {
  if (user.isPlatformAdmin) return
  const teamId = namespace.replace(/^team-/, '')
  if (!namespace.startsWith('team-') || !user.teams.includes(teamId)) {
    throw new HttpError(403, `User not allowed to access namespace "${namespace}"`)
  }
}
