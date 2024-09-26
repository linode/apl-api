import axios from 'axios'
import https from 'https'

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
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
): Promise<{ username: string; email: string }[]> {
  try {
    const token = await getKeycloakToken(keycloakBaseUrl, realm, username, password)
    const url = `${keycloakBaseUrl}/admin/realms/${realm}/users`

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      httpsAgent,
    })

    const users = [] as { username: string; email: string }[]
    for (const user of response.data) {
      if (user.username === 'otomi-admin') continue
      users.push({
        username: user.username,
        email: user.email,
      })
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
