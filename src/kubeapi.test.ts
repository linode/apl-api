import { ApiException, KubeConfig, PatchStrategy, setHeaderOptions } from '@kubernetes/client-node'
import KubeApi from './kubeapi'

const mockLoadFromDefault = jest.fn()
const mockMakeApiClient = jest.fn(() => ({}))
const mockDebug = jest.fn()

jest.mock('@kubernetes/client-node', () => {
  class MockApiException extends Error {
    code: number

    constructor(code: number) {
      super(`api error ${code}`)
      this.code = code
    }
  }

  return {
    ApiException: MockApiException,
    CoreV1Api: class CoreV1Api {},
    CustomObjectsApi: class CustomObjectsApi {},
    RbacAuthorizationV1Api: class RbacAuthorizationV1Api {},
    PatchStrategy: { ServerSideApply: 'application/apply-patch+yaml' },
    setHeaderOptions: jest.fn().mockReturnValue('header-options'),
    KubeConfig: jest.fn().mockImplementation(() => ({
      makeApiClient: mockMakeApiClient,
      loadFromDefault: mockLoadFromDefault,
    })),
  }
})

jest.mock('debug', () => ({ __esModule: true, default: jest.fn(() => mockDebug) }))

describe('KubeApi', () => {
  const params = { namespace: 'team-a', body: { metadata: { name: 'resource' }, spec: {} } }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('loads the default Kubernetes configuration and creates clients', () => {
    new KubeApi()

    expect(KubeConfig).toHaveBeenCalledTimes(1)
    expect(mockLoadFromDefault).toHaveBeenCalledTimes(1)
    expect(mockMakeApiClient).toHaveBeenCalledTimes(3)
  })

  test('createOrPatch returns the created resource without patching', async () => {
    const createFn = jest.fn().mockResolvedValue({ kind: 'created' })
    const patchFn = jest.fn()

    await expect(new KubeApi().createOrPatch(createFn, patchFn, params)).resolves.toEqual({ kind: 'created' })
    expect(createFn).toHaveBeenCalledWith(params)
    expect(patchFn).not.toHaveBeenCalled()
  })

  test('createOrPatch applies a server-side patch on conflict', async () => {
    const createFn = jest.fn().mockRejectedValue(new ApiException(409, '', {}, {}))
    const patchFn = jest.fn().mockResolvedValue({ kind: 'patched' })

    await expect(new KubeApi().createOrPatch(createFn, patchFn, params)).resolves.toEqual({ kind: 'patched' })
    expect(patchFn).toHaveBeenCalledWith(
      { name: 'resource', ...params, fieldManager: 'apl-api', force: true },
      'header-options',
    )
    expect(setHeaderOptions).toHaveBeenCalledWith('Content-Type', PatchStrategy.ServerSideApply)
  })

  test('createOrPatch propagates errors other than conflicts', async () => {
    const error = new ApiException(403, '', {}, {})
    const patchFn = jest.fn()

    await expect(new KubeApi().createOrPatch(jest.fn().mockRejectedValue(error), patchFn, params)).rejects.toBe(error)
    expect(patchFn).not.toHaveBeenCalled()
  })

  test('deleteIfExists calls the delete function successfully', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined)

    await expect(new KubeApi().deleteIfExists(deleteFn, { name: 'resource' })).resolves.toBeUndefined()
    expect(deleteFn).toHaveBeenCalledWith({ name: 'resource' })
  })

  test('deleteIfExists ignores missing resources', async () => {
    const deleteFn = jest.fn().mockRejectedValue(new ApiException(404, '', {}, {}))

    await expect(new KubeApi().deleteIfExists(deleteFn, { name: 'resource' })).resolves.toBeUndefined()
    expect(mockDebug).not.toHaveBeenCalled()
  })

  test('deleteIfExists logs other errors and continues', async () => {
    const error = new ApiException(500, '', {}, {})

    await expect(
      new KubeApi().deleteIfExists(jest.fn().mockRejectedValue(error), { name: 'resource' }),
    ).resolves.toBeUndefined()
    expect(mockDebug).toHaveBeenCalledWith(error)
  })
})
