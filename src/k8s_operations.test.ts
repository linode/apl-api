import { CoreV1Api } from '@kubernetes/client-node'
import { getCloudttyActiveTime, getLogTime } from './k8s_operations'

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
        return {}
      }),
    })),
  }
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
