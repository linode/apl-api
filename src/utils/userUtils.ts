import axios from 'axios'
import { ROOT_KEYCLOAK_USER, cleanEnv } from 'src/validators'

const env = cleanEnv({
  ROOT_KEYCLOAK_USER,
})

async function getKeycloakToken(keycloakBaseUrl: string, realm: string, username: string, password: string) {
  try {
    const response = await axios.post(
      `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username,
        password,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )

    return response.data.access_token
  } catch (error) {
    console.error('Failed to get access token:', error.response?.data || error.message)
    throw error
  }
}

export async function getKeycloakUsers(
  keycloakBaseUrl: string,
  realm: string,
  username: string,
  password: string,
): Promise<string[]> {
  try {
    const token = await getKeycloakToken(keycloakBaseUrl, realm, username, password)
    const url = `${keycloakBaseUrl}/admin/realms/${realm}/users`

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const users = [] as string[]
    for (const user of response.data) {
      if (user.username === env.ROOT_KEYCLOAK_USER) continue
      users.push(user.email)
    }
    return users
  } catch (error) {
    if (error.response) {
      console.error('Failed to fetch users:', error.response)
      if (error.response.status === 403)
        console.error('Permission denied. Check if the token has the necessary permissions.')
    } else console.error('Failed to fetch users:', error.message)

    return []
  }
}

// gitea username blacklist and validation
// https://github.com/go-gitea/gitea/blob/b8b856c7455166ef580d83a29b57c9b877d052b4/models/user/user.go#L563
const reservedUsernames = [
  '.',
  '..',
  '.well-known',
  'admin',
  'api',
  'assets',
  'attachments',
  'avatar',
  'avatars',
  'captcha',
  'commits',
  'debug',
  'error',
  'explore',
  'favicon.ico',
  'ghost',
  'issues',
  'login',
  'manifest.json',
  'metrics',
  'milestones',
  'new',
  'notifications',
  'org',
  'pulls',
  'raw',
  'repo',
  'repo-avatars',
  'robots.txt',
  'search',
  'serviceworker.js',
  'ssh_info',
  'swagger.v1.json',
  'user',
  'v2',
  'gitea-actions',
  // reserved for keycloak root user
  'otomi-admin',
]

const reservedUserPatterns = ['*.keys', '*.gpg', '*.rss', '*.atom']

const reservedRegexPatterns = reservedUserPatterns.map((pattern) => new RegExp(`^.*\\${pattern.slice(1)}$`))

export function isValidUsername(username: string): { valid: boolean; error: string | null } {
  const usernameRegex = /^(?![-_.])(?!.*[-_.]{2})[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/

  if (!username || username.length < 3 || username.length > 30)
    return { valid: false, error: 'Username (the part of the email before "@") must be between 3 and 30 characters.' }

  if (!usernameRegex.test(username))
    return { valid: false, error: 'Invalid username (the part of the email before "@") format.' }

  if (reservedUsernames.includes(username))
    return { valid: false, error: 'This username (the part of the email before "@") is reserved.' }

  if (reservedRegexPatterns.some((regex) => regex.test(username))) {
    return {
      valid: false,
      error: 'Usernames (the part of the email before "@") ending with .keys, .gpg, .rss, or .atom are not allowed.',
    }
  }

  return { valid: true, error: null }
}
