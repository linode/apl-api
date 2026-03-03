import * as fileMap from './file-map'
import { FileStore } from './file-store'

describe('FileStore.getNamespacesWithSealedSecrets', () => {
  let fileStore: FileStore

  beforeEach(() => {
    fileStore = new FileStore()
    ;(fileStore as any).store = new Map()

    jest.spyOn(fileMap, 'getFileMapForKind').mockReturnValue({
      pathTemplate: 'env/manifests/namespaces/{namespace}/sealedsecrets/{name}.yaml',
    } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns unique namespaces that contain sealedsecrets', () => {
    const store = (fileStore as any).store as Map<string, any>

    store.set('env/manifests/namespaces/argocd/sealedsecrets/a.yaml', {})
    store.set('env/manifests/namespaces/argocd/sealedsecrets/b.yaml', {})
    store.set('env/manifests/namespaces/harbor/sealedsecrets/x.yaml', {})

    const result = fileStore.getNamespacesWithSealedSecrets()

    expect(result.sort()).toEqual(['argocd', 'harbor'])
  })

  it('ignores team sealedsecrets', () => {
    const store = (fileStore as any).store as Map<string, any>

    store.set('env/teams/team-a/sealedsecrets/a.yaml', {})
    store.set('env/manifests/namespaces/argocd/sealedsecrets/a.yaml', {})

    const result = fileStore.getNamespacesWithSealedSecrets()

    expect(result).toEqual(['argocd'])
  })

  it('returns empty array when no namespace sealedsecrets exist', () => {
    const store = (fileStore as any).store as Map<string, any>

    store.set('env/teams/team-a/sealedsecrets/a.yaml', {})

    const result = fileStore.getNamespacesWithSealedSecrets()

    expect(result).toEqual([])
  })

  it('throws if fileMap is missing', () => {
    ;(fileMap.getFileMapForKind as jest.Mock).mockReturnValue(undefined)

    expect(() => fileStore.getNamespacesWithSealedSecrets()).toThrow('Unknown kind: AplNamespaceSealedSecret')
  })

  it('throws if pathTemplate is not namespace-scoped', () => {
    ;(fileMap.getFileMapForKind as jest.Mock).mockReturnValue({
      pathTemplate: 'env/sealedsecrets/{name}.yaml',
    })

    expect(() => fileStore.getNamespacesWithSealedSecrets()).toThrow('not namespace-scoped')
  })
})
