import axios from 'axios'
import { Build, Cluster } from 'src/otomi-models'
import * as utils from 'src/utils'
import { createGiteaWebhook, deleteGiteaWebhook, getServiceUrl, updateGiteaWebhook } from 'src/utils'

describe('Utils', () => {
  const cluster: Cluster = {
    domainSuffix: 'dev.otomi.cloud',
    apiServer: 'apiServer.onprem.example.com',
    name: 'dev',
    provider: 'custom',
  }
  const dns = {
    aws: { region: 'r' },
  }

  test('should retrieve host part from service domain', () => {
    const x = getServiceUrl({ domain: 'aa.bb.cc.dd.ee', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).toEqual('aa.bb.cc')
  })

  test('should retrieve only domain', () => {
    const x = getServiceUrl({ domain: 'my.custom.domain', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).toEqual('')
    expect(x.domain).toEqual('my.custom.domain')
  })

  test('should retrieve default host if service domain not defined', () => {
    const x = getServiceUrl({ name: 'aa', teamId: 'bb', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).toEqual('aa-bb')
    expect(x.domain).toEqual('dev.otomi.cloud')
  })

  test('should retrieve host and domain part from service domain (many zones)', () => {
    const x = getServiceUrl({
      domain: 'aa.bb.cc.dd.ee',
      name: 'aa',
      teamId: 'bb',
      cluster,
      dns: { ...dns, zones: ['cc.dd.ee', 'dd.ee', 'bb.cc.dd.ee'] },
    })
    expect(x.subdomain).toEqual('aa')
    expect(x.domain).toEqual('bb.cc.dd.ee')
  })
})

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
    jest.spyOn(utils, 'webhookConfig').mockReturnValue(webhookConfigValues)
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
