import * as k8s from '@kubernetes/client-node'
import { expect } from 'chai'
import sinon from 'sinon'
import { getCloudttyActiveTime, getLogTime } from './k8s_operations'

describe('getCloudttyLogTime', () => {
  it('should return the timestamp for a valid log timestamp', () => {
    const timestampMatch = ['[2023/10/10 00:00:00:0000]', '2023/10/10 00:00:00:0000']
    const result = getLogTime(timestampMatch)
    expect(result).to.equal(1696888800000)
  })

  it('should return NaN for an invalid log timestamp', () => {
    const timestampMatch = ['[invalid-timestamp]', 'invalid-date invalid-time']

    const result = getLogTime(timestampMatch)
    expect(result).to.be.NaN
  })
})

describe('getCloudttyActiveTime', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('should return the time difference if no clients', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = '[2023/10/10 00:00:00:0000] [INFO] clients: 0'
    sinon.stub(k8s.CoreV1Api.prototype, 'readNamespacedPodLog').resolves({ body: log } as any)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).to.be.greaterThan(0)
  })

  it('should return 0 if clients are connected', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = '[2023/10/10 00:00:00:0000] [INFO] clients: 1'
    sinon.stub(k8s.CoreV1Api.prototype, 'readNamespacedPodLog').resolves({ body: log } as any)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).to.equal(0)
  })

  it('should return undefined if log does not contain client count', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = '[2023/10/10 00:00:00:0000] [INFO] some other log message'
    sinon.stub(k8s.CoreV1Api.prototype, 'readNamespacedPodLog').resolves({ body: log } as any)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).to.be.undefined
  })

  it('should return undefined if log is empty', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    const log = ''
    sinon.stub(k8s.CoreV1Api.prototype, 'readNamespacedPodLog').resolves({ body: log } as any)

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).to.be.undefined
  })

  it('should return undefined if an error occurs', async () => {
    const namespace = 'test-namespace'
    const podName = 'test-pod'
    sinon.stub(k8s.CoreV1Api.prototype, 'readNamespacedPodLog').rejects(new Error('test error'))

    const result = await getCloudttyActiveTime(namespace, podName)
    expect(result).to.be.undefined
  })
})
