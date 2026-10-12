import CloudTty, { TtyConfig } from './tty'
import { SessionUser } from './otomi-models'

const mockCoreV1Api = {
  createNamespacedServiceAccount: jest.fn(),
  patchNamespacedServiceAccount: jest.fn(),
  deleteNamespacedServiceAccount: jest.fn(),
  createNamespacedPod: jest.fn(),
  patchNamespacedPod: jest.fn(),
  deleteNamespacedPod: jest.fn(),
  createNamespacedService: jest.fn(),
  patchNamespacedService: jest.fn(),
  deleteNamespacedService: jest.fn(),
}

const mockCustomObjectsApi = {
  createNamespacedCustomObject: jest.fn(),
  patchNamespacedCustomObject: jest.fn(),
  deleteNamespacedCustomObject: jest.fn(),
}

const mockRbacAuthorizationApi = {
  createNamespacedRoleBinding: jest.fn(),
  patchNamespacedRoleBinding: jest.fn(),
  deleteNamespacedRoleBinding: jest.fn(),
  createClusterRoleBinding: jest.fn(),
  patchClusterRoleBinding: jest.fn(),
  deleteClusterRoleBinding: jest.fn(),
}

const mockMakeApiClient = jest.fn((apiClientType) => {
  if (apiClientType.name === 'CoreV1Api') {
    return mockCoreV1Api
  }
  if (apiClientType.name === 'CustomObjectsApi') {
    return mockCustomObjectsApi
  }
  return mockRbacAuthorizationApi
})

jest.mock('@kubernetes/client-node', () => {
  class CoreV1Api {}
  class CustomObjectsApi {}
  class RbacAuthorizationV1Api {}

  return {
    CoreV1Api,
    CustomObjectsApi,
    RbacAuthorizationV1Api,
    KubeConfig: jest.fn().mockImplementation(() => ({
      makeApiClient: mockMakeApiClient,
      loadFromDefault: jest.fn(),
    })),
  }
})

describe('CloudTty', () => {
  const testConfig: TtyConfig = {
    imageRepository: 'tty-image',
    imageTag: 'tty-tag',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCustomObjectsApi.createNamespacedCustomObject.mockResolvedValue({ kind: 'ok' })
    mockCustomObjectsApi.patchNamespacedCustomObject.mockResolvedValue({ kind: 'ok' })
    mockCoreV1Api.createNamespacedServiceAccount.mockResolvedValue({ kind: 'ok' })
    mockCoreV1Api.patchNamespacedServiceAccount.mockResolvedValue({ kind: 'ok' })
    mockCoreV1Api.createNamespacedPod.mockResolvedValue({ kind: 'ok' })
    mockCoreV1Api.patchNamespacedPod.mockResolvedValue({ kind: 'ok' })
    mockCoreV1Api.createNamespacedService.mockResolvedValue({ kind: 'ok' })
    mockCoreV1Api.patchNamespacedService.mockResolvedValue({ kind: 'ok' })
    mockRbacAuthorizationApi.createNamespacedRoleBinding.mockResolvedValue({ kind: 'ok' })
    mockRbacAuthorizationApi.patchNamespacedRoleBinding.mockResolvedValue({ kind: 'ok' })
    mockRbacAuthorizationApi.createClusterRoleBinding.mockResolvedValue({ kind: 'ok' })
    mockRbacAuthorizationApi.patchClusterRoleBinding.mockResolvedValue({ kind: 'ok' })
  })

  test('createAuthorizationPolicy passes expected API parameters', async () => {
    const tty = new CloudTty(testConfig)

    await tty.createAuthorizationPolicy('team-a', 'user-1')

    expect(mockCustomObjectsApi.createNamespacedCustomObject).toHaveBeenCalledTimes(1)
    const params = mockCustomObjectsApi.createNamespacedCustomObject.mock.calls[0][0]

    expect(params).toEqual(
      expect.objectContaining({
        group: 'security.istio.io',
        version: 'v1',
        namespace: 'team-a',
        plural: 'authorizationpolicies',
      }),
    )
    expect(params.body.metadata).toEqual(
      expect.objectContaining({
        name: 'tty-user-1',
        namespace: 'team-a',
      }),
    )
    expect(params.body.spec.rules[0].when[0]).toEqual(
      expect.objectContaining({
        key: 'request.auth.claims[sub]',
        values: ['user-1'],
      }),
    )
  })

  test('createPod sends namespace and key pod configuration fields', async () => {
    const tty = new CloudTty(testConfig)

    await tty.createPod('team-a', 'user-1')

    expect(mockCoreV1Api.createNamespacedPod).toHaveBeenCalledTimes(1)
    const params = mockCoreV1Api.createNamespacedPod.mock.calls[0][0]

    expect(params.namespace).toBe('team-a')
    expect(params.body.metadata).toEqual(
      expect.objectContaining({
        name: 'tty-user-1',
        namespace: 'team-a',
      }),
    )
    expect(params.body.spec).toEqual(
      expect.objectContaining({
        serviceAccountName: 'tty-user-1',
      }),
    )
    expect(params.body.spec.containers[0]).toEqual(
      expect.objectContaining({
        name: 'tty',
        image: 'tty-image:tty-tag',
      }),
    )
  })

  test('createRoute sends expected route metadata and host/path settings', async () => {
    const tty = new CloudTty(testConfig)

    await tty.createRoute('team-a', 'user-1', 'example.org')

    expect(mockCustomObjectsApi.createNamespacedCustomObject).toHaveBeenCalledTimes(1)
    const params = mockCustomObjectsApi.createNamespacedCustomObject.mock.calls[0][0]

    expect(params).toEqual(
      expect.objectContaining({
        group: 'gateway.networking.k8s.io',
        version: 'v1',
        plural: 'httproutes',
        namespace: 'team-a',
      }),
    )
    expect(params.body.metadata.name).toBe('tty-user-1')
    expect(params.body.spec.hostnames).toEqual(['tty.example.org'])
    expect(params.body.spec.rules[0].backendRefs[0]).toEqual(
      expect.objectContaining({
        kind: 'Service',
        name: 'tty-user-1',
        port: 8080,
      }),
    )
    expect(params.body.spec.rules[0].matches[0].path.value).toBe('/user-1')
  })

  test('createTty for platform admin creates cluster role binding only', async () => {
    const tty = new CloudTty(testConfig)
    const createAuthorizationPolicy = jest.spyOn(tty, 'createAuthorizationPolicy').mockResolvedValue({ kind: 'ok' })
    const createServiceAccount = jest.spyOn(tty, 'createServiceAccount').mockResolvedValue({ kind: 'ok' })
    const createPod = jest.spyOn(tty, 'createPod').mockResolvedValue({ kind: 'ok' })
    const createClusterRoleBinding = jest.spyOn(tty, 'createClusterRoleBinding').mockResolvedValue({ kind: 'ok' })
    const createRoleBinding = jest.spyOn(tty, 'createRoleBinding').mockResolvedValue({ kind: 'ok' })
    const createService = jest.spyOn(tty, 'createService').mockResolvedValue({ kind: 'ok' })
    const createRoute = jest.spyOn(tty, 'createRoute').mockResolvedValue({ kind: 'ok' })

    await tty.createTty('team-1', { sub: 'user-1', isPlatformAdmin: true } as SessionUser, 'example.org')

    expect(createAuthorizationPolicy).toHaveBeenCalledWith('team-admin', 'user-1')
    expect(createServiceAccount).toHaveBeenCalledWith('team-admin', 'user-1')
    expect(createPod).toHaveBeenCalledWith('team-admin', 'user-1')
    expect(createClusterRoleBinding).toHaveBeenCalledWith('team-admin', 'user-1')
    expect(createRoleBinding).not.toHaveBeenCalled()
    expect(createService).toHaveBeenCalledWith('team-admin', 'user-1')
    expect(createRoute).toHaveBeenCalledWith('team-admin', 'user-1', 'example.org')
  })

  test('createTty for team user creates role bindings for all teams', async () => {
    const tty = new CloudTty(testConfig)
    jest.spyOn(tty, 'createAuthorizationPolicy').mockResolvedValue({ kind: 'ok' })
    jest.spyOn(tty, 'createServiceAccount').mockResolvedValue({ kind: 'ok' })
    jest.spyOn(tty, 'createPod').mockResolvedValue({ kind: 'ok' })
    const createClusterRoleBinding = jest.spyOn(tty, 'createClusterRoleBinding').mockResolvedValue({ kind: 'ok' })
    const createRoleBinding = jest.spyOn(tty, 'createRoleBinding').mockResolvedValue({ kind: 'ok' })
    jest.spyOn(tty, 'createService').mockResolvedValue({ kind: 'ok' })
    jest.spyOn(tty, 'createRoute').mockResolvedValue({ kind: 'ok' })

    await tty.createTty('a', { sub: 'user-1', isPlatformAdmin: false, teams: ['a', 'b'] } as SessionUser, 'example.org')

    expect(createClusterRoleBinding).not.toHaveBeenCalled()
    expect(createRoleBinding).toHaveBeenCalledTimes(2)
    expect(createRoleBinding).toHaveBeenNthCalledWith(1, 'team-a', 'team-a', 'user-1')
    expect(createRoleBinding).toHaveBeenNthCalledWith(2, 'team-a', 'team-b', 'user-1')
  })

  test('deleteTty removes namespaced and team-scoped resources for team users', async () => {
    const tty = new CloudTty(testConfig)
    const deleteAuthorizationPolicy = jest.spyOn(tty, 'deleteAuthorizationPolicy').mockResolvedValue()
    const deleteServiceAccount = jest.spyOn(tty, 'deleteServiceAccount').mockResolvedValue()
    const deletePod = jest.spyOn(tty, 'deletePod').mockResolvedValue()
    const deleteClusterRoleBinding = jest.spyOn(tty, 'deleteClusterRoleBinding').mockResolvedValue()
    const deleteRoleBinding = jest.spyOn(tty, 'deleteRoleBinding').mockResolvedValue()
    const deleteService = jest.spyOn(tty, 'deleteService').mockResolvedValue()
    const deleteRoute = jest.spyOn(tty, 'deleteRoute').mockResolvedValue()

    await tty.deleteTty('a', { sub: 'user-1', isPlatformAdmin: false, teams: ['a', 'b'] } as SessionUser)

    expect(deleteAuthorizationPolicy).toHaveBeenCalledWith('team-a', 'user-1')
    expect(deleteServiceAccount).toHaveBeenCalledWith('team-a', 'user-1')
    expect(deletePod).toHaveBeenCalledWith('team-a', 'user-1')
    expect(deleteClusterRoleBinding).not.toHaveBeenCalled()
    expect(deleteRoleBinding).toHaveBeenCalledTimes(2)
    expect(deleteRoleBinding).toHaveBeenNthCalledWith(1, 'team-a', 'user-1')
    expect(deleteRoleBinding).toHaveBeenNthCalledWith(2, 'team-b', 'user-1')
    expect(deleteService).toHaveBeenCalledWith('team-a', 'user-1')
    expect(deleteRoute).toHaveBeenCalledWith('team-a', 'user-1')
  })
})
