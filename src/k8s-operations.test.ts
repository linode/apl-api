import { CoreV1Api, CustomObjectsApi, V1Service } from '@kubernetes/client-node'
import {
  getCloudttyActiveTime,
  getLogTime,
  getServiceStatus,
  mergeCanaryServices,
  parseHTTPRouteStatus,
  toK8sService,
} from './k8s-operations'
import { AplServiceResponse } from './otomi-models'

// Mock the KubeConfig
jest.mock('@kubernetes/client-node', () => {
  const actual = jest.requireActual('@kubernetes/client-node')
  return {
    ...actual,
    KubeConfig: jest.fn().mockImplementation(() => ({
      loadFromDefault: jest.fn(),
      makeApiClient: jest.fn((apiClientType) => {
        if (apiClientType === actual.CoreV1Api) {
          return new actual.CoreV1Api()
        }
        if (apiClientType === actual.CustomObjectsApi) {
          return new actual.CustomObjectsApi()
        }
        return {}
      }),
    })),
  }
})

const makeService = (overrides: Partial<V1Service> = {}): V1Service => ({
  metadata: { name: 'my-svc', labels: {} },
  spec: { type: 'ClusterIP', ports: [{ port: 8080 }] },
  ...overrides,
})

describe('toK8sService', () => {
  test('maps a regular service', () => {
    const result = toK8sService(makeService())
    expect(result).toEqual({ name: 'my-svc', ports: [8080], managedByKnative: false })
  })

  test('returns the raw service name', () => {
    const svc = makeService({ metadata: { name: 'my-svc-v1', labels: {} } })
    expect(toK8sService(svc)?.name).toBe('my-svc-v1')
  })

  test('filters out knative private services', () => {
    const svc = makeService({
      metadata: { name: 'private-svc', labels: { 'networking.internal.knative.dev/serviceType': 'Private' } },
    })
    expect(toK8sService(svc)).toBeNull()
  })

  test('filters out ClusterIP knative revision services', () => {
    const svc = makeService({
      metadata: { name: 'revision-svc', labels: { 'serving.knative.dev/service': 'my-ksvc' } },
      spec: { type: 'ClusterIP', ports: [{ port: 80 }] },
    })
    expect(toK8sService(svc)).toBeNull()
  })

  test('maps ExternalName knative service and sets managedByKnative', () => {
    const svc = makeService({
      metadata: { name: 'external-svc', labels: { 'serving.knative.dev/service': 'my-ksvc' } },
      spec: { type: 'ExternalName', ports: [{ port: 80 }] },
    })
    const result = toK8sService(svc)
    expect(result).toEqual({ name: 'my-ksvc', ports: [80], managedByKnative: true })
  })
})

describe('mergeCanaryServices', () => {
  test('returns services unchanged when no canary variants present', () => {
    const services = [
      { name: 'svc-a', ports: [80], managedByKnative: false },
      { name: 'svc-b', ports: [8080], managedByKnative: false },
    ]
    expect(mergeCanaryServices(services)).toEqual(services)
  })

  test('groups -v1 and -v2 variants into a single entry with the base name', () => {
    const services = [
      { name: 'my-svc-v1', ports: [80], managedByKnative: false },
      { name: 'my-svc-v2', ports: [80], managedByKnative: false },
    ]
    expect(mergeCanaryServices(services)).toEqual([{ name: 'my-svc', ports: [80], managedByKnative: false }])
  })

  test('does not strip suffix when only one variant exists', () => {
    const services = [{ name: 'my-svc-v1', ports: [80], managedByKnative: false }]
    expect(mergeCanaryServices(services)).toEqual([{ name: 'my-svc-v1', ports: [80], managedByKnative: false }])
  })

  test('retains the data from the -v1 variant', () => {
    const services = [
      { name: 'my-svc-v1', ports: [80, 443], managedByKnative: true },
      { name: 'my-svc-v2', ports: [8080], managedByKnative: false },
    ]
    expect(mergeCanaryServices(services)).toEqual([{ name: 'my-svc', ports: [80, 443], managedByKnative: true }])
  })
})

describe('getCloudttyLogTime', () => {
  test('should return the timestamp for a valid log timestamp', () => {
    const timestampMatch = ['[2023/10/10 00:00:00:0000]', '2023/10/10 00:00:00:0000']
    const result = getLogTime(timestampMatch)
    const timestamp = new Date('2023-10-10T00:00:00.000').getTime()
    expect(result).toBe(timestamp)
  })

  test('should return NaN for an invalid log timestamp', () => {
    const timestampMatch = ['[invalid-timestamp]', 'invalid-date invalid-time']
    const result = getLogTime(timestampMatch)
    expect(result).toBeNaN()
  })
})

describe('getCloudttyActiveTime', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should return the time difference if no clients', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = '[2023/10/10 00:00:00:0000] [INFO] clients: 0'
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedPodLog').mockResolvedValue(log)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).toBeGreaterThan(0)
  })

  test('should return 0 if clients are connected', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = '[2023/10/10 00:00:00:0000] [INFO] clients: 1'
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedPodLog').mockResolvedValue(log)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).toBe(0)
  })

  test('should return undefined if log does not contain client count', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = '[2023/10/10 00:00:00:0000] [INFO] some other log message'
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedPodLog').mockResolvedValue(log)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).toBeUndefined()
  })

  test('should return undefined if log is empty', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = ''
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedPodLog').mockResolvedValue(log)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).toBeUndefined()
  })

  test('should return undefined if an error occurs', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedPodLog').mockRejectedValue(new Error('test error'))

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeServiceResponse = (name: string, teamName: string, overrides: Record<string, any> = {}): AplServiceResponse =>
  ({
    kind: 'AplTeamService',
    metadata: { name, labels: { 'apl.io/teamId': teamName } },
    spec: {},
    ...overrides,
  }) as unknown as AplServiceResponse

const makeHTTPRoute = (
  conditions: { type: string; status: string }[],
  options: { parentGatewayName?: string; visibility?: string } = {},
) => ({
  metadata: {
    labels: {
      'networking.knative.dev/visibility': options.visibility ?? '',
    },
  },
  spec: {
    parentRefs: [{ name: options.parentGatewayName ?? 'platform' }],
  },
  status: {
    parents: [
      {
        conditions,
        controllerName: 'istio.io/gateway-controller',
        parentRef: {
          group: 'gateway.networking.k8s.io',
          kind: 'Gateway',
          name: options.parentGatewayName ?? 'platform',
        },
      },
    ],
  },
})

// ---------------------------------------------------------------------------
// parseHTTPRouteStatus
// ---------------------------------------------------------------------------

describe('parseHTTPRouteStatus', () => {
  test('returns true when Accepted and ResolvedRefs are both True', () => {
    const route = makeHTTPRoute([
      { type: 'Accepted', status: 'True' },
      { type: 'ResolvedRefs', status: 'True' },
    ])
    expect(parseHTTPRouteStatus(route)).toBe(true)
  })

  test('returns false when Accepted is False', () => {
    const route = makeHTTPRoute([
      { type: 'Accepted', status: 'False' },
      { type: 'ResolvedRefs', status: 'True' },
    ])
    expect(parseHTTPRouteStatus(route)).toBe(false)
  })

  test('returns false when ResolvedRefs is False', () => {
    const route = makeHTTPRoute([
      { type: 'Accepted', status: 'True' },
      { type: 'ResolvedRefs', status: 'False' },
    ])
    expect(parseHTTPRouteStatus(route)).toBe(false)
  })

  test('returns false when conditions are empty', () => {
    expect(parseHTTPRouteStatus(makeHTTPRoute([]))).toBe(false)
  })

  test('returns false when parents array is missing', () => {
    expect(parseHTTPRouteStatus({ status: {} })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getServiceStatus
// ---------------------------------------------------------------------------

describe('getServiceStatus', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockList = (items: any[]) =>
    jest.spyOn(CustomObjectsApi.prototype, 'listNamespacedCustomObject').mockResolvedValue({ items } as any)

  test('returns NotFound when no HTTPRoutes exist', async () => {
    mockList([])
    const result = await getServiceStatus(makeServiceResponse('web', 'alpha'))
    expect(result).toBe('NotFound')
  })

  test('returns NotFound when only local HTTPRoutes exist', async () => {
    mockList([
      makeHTTPRoute(
        [
          { type: 'Accepted', status: 'True' },
          { type: 'ResolvedRefs', status: 'True' },
        ],
        { parentGatewayName: 'knative-local-gateway', visibility: 'cluster-local' },
      ),
    ])
    const result = await getServiceStatus(makeServiceResponse('web', 'alpha'))
    expect(result).toBe('NotFound')
  })

  test('returns Unknown when multiple HTTPRoutes are found', async () => {
    mockList([makeHTTPRoute([]), makeHTTPRoute([])])
    const result = await getServiceStatus(makeServiceResponse('web', 'alpha'))
    expect(result).toBe('Unknown')
  })

  test('returns Succeeded when single HTTPRoute is accepted', async () => {
    mockList([
      makeHTTPRoute([
        { type: 'Accepted', status: 'True' },
        { type: 'ResolvedRefs', status: 'True' },
      ]),
    ])
    const result = await getServiceStatus(makeServiceResponse('web', 'alpha'))
    expect(result).toBe('Succeeded')
  })

  test('returns Succeeded when local and public routes exist and public is accepted', async () => {
    mockList([
      makeHTTPRoute(
        [
          { type: 'Accepted', status: 'True' },
          { type: 'ResolvedRefs', status: 'True' },
        ],
        { parentGatewayName: 'knative-local-gateway', visibility: 'cluster-local' },
      ),
      makeHTTPRoute([
        { type: 'Accepted', status: 'True' },
        { type: 'ResolvedRefs', status: 'True' },
      ]),
    ])
    const result = await getServiceStatus(makeServiceResponse('web', 'alpha'))
    expect(result).toBe('Succeeded')
  })

  test('returns Unknown when single HTTPRoute is not accepted', async () => {
    mockList([
      makeHTTPRoute([
        { type: 'Accepted', status: 'False' },
        { type: 'ResolvedRefs', status: 'True' },
      ]),
    ])
    const result = await getServiceStatus(makeServiceResponse('web', 'alpha'))
    expect(result).toBe('Unknown')
  })

  test('queries with the correct label selector and namespace', async () => {
    const spy = mockList([])
    await getServiceStatus(makeServiceResponse('my-app', 'dev'))
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        group: 'gateway.networking.k8s.io',
        version: 'v1',
        namespace: 'team-dev',
        plural: 'httproutes',
        labelSelector: 'otomi.io/app=my-app',
      }),
    )
  })

  test('returns NotFound when the k8s API call throws', async () => {
    jest.spyOn(CustomObjectsApi.prototype, 'listNamespacedCustomObject').mockRejectedValue(new Error('network error'))
    const result = await getServiceStatus(makeServiceResponse('web', 'alpha'))
    expect(result).toBe('NotFound')
  })
})
