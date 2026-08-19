import { ensureDir, remove } from 'fs-extra'
import { writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'

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

describe('FileStore.load', () => {
  let envDir: string

  beforeEach(async () => {
    envDir = path.join(os.tmpdir(), `apl-api-file-store-${Date.now()}`)

    await ensureDir(path.join(envDir, 'env/teams/alpha/builds'))
  })

  afterEach(async () => {
    await remove(envDir)
  })

  it('continues loading when a build contains invalid YAML', async () => {
    await writeFile(
      path.join(envDir, 'env/teams/alpha/builds/healthy.yaml'),
      `
kind: AplTeamBuild
metadata:
  name: healthy
  labels:
    apl.io/teamId: alpha
spec:
  repositoryUrl: https://github.com/example/repository
status: {}
`,
      'utf8',
    )

    await writeFile(
      path.join(envDir, 'env/teams/alpha/builds/broken.yaml'),
      `
kind: AplTeamBuild
metadata:
  name: broken
spec:
  repositoryUrl: [this is invalid yaml
`,
      'utf8',
    )

    const store = await FileStore.load(envDir)

    expect(store.getTeamResource('AplTeamBuild', 'alpha', 'healthy')).toBeDefined()

    expect(store.getTeamResource('AplTeamBuild', 'alpha', 'broken')).toBeUndefined()
  })
})
