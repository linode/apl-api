import axios from 'axios'
import { Build } from 'src/otomi-models'
import * as giteaUtils from 'src/utils/giteaUtils'
import { createGiteaWebhook, deleteGiteaWebhook, updateGiteaWebhook } from './giteaUtils'

describe('Gitea Utils', () => {
  const webhookId = 1
  const teamId = 'demo'
  const build: Build = {
    id: '1',
    teamId,
    name: 'blue-demo',
    tag: 'latest',
    mode: {
      docker: {
        repoUrl: 'https://gitea.demo.com/repos/team-demo/blue-demo',
      },
      type: 'docker',
    },
  }

  const mockWebHookResponse = {
    data: {
      id: 1,
      type: 'gitea',
      config: {
        content_type: 'json',
        url: 'http://el-gitea-webhook-test.demo.svc.cluster.local:8080',
      },
      events: ['push'],
      authorization_header: '',
      active: true,
      updated_at: '2025-02-21T13:26:03Z',
      created_at: '2025-02-21T13:26:03Z',
    },
  }

  beforeEach(() => {
    const webhookConfigValues = {
      type: 'gitea',
      active: true,
      events: ['push'],
      config: {
        content_type: 'json',
        url: 'http://el-gitea-webhook-test.demo.svc.cluster.local:8080',
      },
    }
    jest.spyOn(giteaUtils, 'webhookConfig').mockReturnValue(webhookConfigValues)
  })

  // With "trigger = true" and "isExternal = false"
  test('Should create a gitea webhook', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue(Promise.resolve(mockWebHookResponse))
    const response = await createGiteaWebhook(teamId, build)

    expect(response).toEqual(mockWebHookResponse.data)
  })

  test('Should return id = undefined because of an error during creation of webhook', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue({ status: 400, message: 'MOCKED ERROR' })
    const response = await createGiteaWebhook(teamId, build)

    expect(response).toEqual({ id: undefined })
  })
  // With "trigger = true" and "isExternal = false"
  test('Should update a gitea webhook', async () => {
    jest.spyOn(axios, 'patch').mockResolvedValue(Promise.resolve(mockWebHookResponse))
    const response = await updateGiteaWebhook(webhookId, teamId, build)

    expect(response).toEqual(mockWebHookResponse.data)
  })
  // With "trigger = true" and "isExternal = false"
  test('Should delete a gitea webhook', async () => {
    jest.spyOn(axios, 'delete').mockResolvedValue({})
    const response = await deleteGiteaWebhook(webhookId, teamId, build)

    expect(response).toEqual({})
  })
})
