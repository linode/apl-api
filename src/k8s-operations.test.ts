import { CoreV1Api, KubernetesObjectApi, PatchStrategy, V1Service } from '@kubernetes/client-node'
import {
  getApiStatusFromConfigMap,
  getCloudttyActiveTime,
  getLogTime,
  mergeCanaryServices,
  setApiStatusInConfigMap,
  toK8sService,
} from './k8s-operations'

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
        if (apiClientType === actual.KubernetesObjectApi) {
          return new actual.KubernetesObjectApi()
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

describe('getApiStatusFromConfigMap', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns { locked: true } when configmap data.locked is "true"', async () => {
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedConfigMap').mockResolvedValue({
      data: { locked: 'true' },
    } as any)
    const result = await getApiStatusFromConfigMap('default')
    expect(result).toEqual({ locked: true })
  })

  it('returns { locked: false } when configmap data.locked is "false"', async () => {
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedConfigMap').mockResolvedValue({
      data: { locked: 'false' },
    } as any)
    const result = await getApiStatusFromConfigMap('default')
    expect(result).toEqual({ locked: false })
  })

  it('returns { locked: false } when configmap does not exist', async () => {
    jest.spyOn(CoreV1Api.prototype, 'readNamespacedConfigMap').mockRejectedValue(new Error('not found'))
    const result = await getApiStatusFromConfigMap('default')
    expect(result).toEqual({ locked: false })
  })
})

describe('setApiStatusInConfigMap', () => {
  afterEach(() => jest.clearAllMocks())

  it('patches the configmap with server-side apply', async () => {
    const patchSpy = jest.spyOn(KubernetesObjectApi.prototype, 'patch').mockResolvedValue({} as any)
    await setApiStatusInConfigMap('default', true)
    expect(patchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'apl-api-status', namespace: 'default' },
        data: { locked: 'true' },
      }),
      undefined,
      undefined,
      'apl-api',
      true,
      PatchStrategy.ServerSideApply,
    )
  })

  it('patches the configmap with locked "false"', async () => {
    const patchSpy = jest.spyOn(KubernetesObjectApi.prototype, 'patch').mockResolvedValue({} as any)
    await setApiStatusInConfigMap('default', false)
    expect(patchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: { locked: 'false' } }),
      undefined,
      undefined,
      'apl-api',
      true,
      PatchStrategy.ServerSideApply,
    )
  })
})
