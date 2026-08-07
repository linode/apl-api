import { getNamespaceResourceFilePath, getResourceFilePath } from './file-map'

describe('getResourceFilePath', () => {
  describe('valid inputs', () => {
    it('returns the correct path for a team-scoped resource', () => {
      const result = getResourceFilePath('AplTeamWorkload', 'my-workload', 'my-team')
      expect(result).toBe('env/teams/my-team/workloads/my-workload.yaml')
    })

    it('returns the correct path for a non-team-scoped resource', () => {
      const result = getResourceFilePath('AplApp', 'harbor')
      expect(result).toBe('env/apps/harbor.yaml')
    })

    it('accepts undefined teamId for resources that do not use it', () => {
      const result = getResourceFilePath('AplUser', 'alice')
      expect(result).toBe('env/users/alice.yaml')
    })

    it('accepts valid names with hyphens and digits', () => {
      const result = getResourceFilePath('AplTeamService', 'svc-01', 'team-01')
      expect(result).toBe('env/teams/team-01/services/svc-01.yaml')
    })
  })

  describe('path traversal protection', () => {
    it('rejects a name containing ../', () => {
      expect(() => getResourceFilePath('AplApp', '../etc/passwd')).toThrow()
    })

    it('rejects a teamId containing ../', () => {
      expect(() => getResourceFilePath('AplTeamWorkload', 'workload', '../../etc')).toThrow()
    })

    it('rejects a name containing path separator /', () => {
      expect(() => getResourceFilePath('AplApp', 'foo/bar')).toThrow()
    })

    it('rejects a name with encoded traversal sequence', () => {
      expect(() => getResourceFilePath('AplApp', '..%2Fetc%2Fpasswd')).toThrow()
    })

    it('rejects a name starting with a dot', () => {
      expect(() => getResourceFilePath('AplApp', '.hidden')).toThrow()
    })

    it('rejects a name with uppercase letters', () => {
      expect(() => getResourceFilePath('AplApp', 'MyApp')).toThrow()
    })

    it('rejects an empty name', () => {
      expect(() => getResourceFilePath('AplApp', '')).toThrow()
    })

    it('rejects a name that is only digits (does not start with a-z)', () => {
      expect(() => getResourceFilePath('AplApp', '123')).toThrow()
    })

    it('rejects a teamId with path traversal characters', () => {
      expect(() => getResourceFilePath('AplTeamService', 'svc', '../admin')).toThrow()
    })
  })
})

describe('getNamespaceResourceFilePath', () => {
  describe('valid inputs', () => {
    it('returns the correct path for a namespace-scoped resource', () => {
      const result = getNamespaceResourceFilePath('AplNamespaceSealedSecret', 'my-secret', 'argocd')
      expect(result).toBe('env/manifests/namespaces/argocd/sealedsecrets/my-secret.yaml')
    })

    it('accepts valid namespace names with hyphens and digits', () => {
      const result = getNamespaceResourceFilePath('AplNamespaceSealedSecret', 'secret-01', 'ns-01')
      expect(result).toBe('env/manifests/namespaces/ns-01/sealedsecrets/secret-01.yaml')
    })
  })

  describe('path traversal protection', () => {
    it('rejects a name containing ../', () => {
      expect(() => getNamespaceResourceFilePath('AplNamespaceSealedSecret', '../etc/passwd', 'argocd')).toThrow()
    })

    it('rejects a namespace containing ../', () => {
      expect(() => getNamespaceResourceFilePath('AplNamespaceSealedSecret', 'secret', '../../etc')).toThrow()
    })

    it('rejects a namespace containing path separator /', () => {
      expect(() => getNamespaceResourceFilePath('AplNamespaceSealedSecret', 'secret', 'foo/bar')).toThrow()
    })

    it('rejects a namespace with encoded traversal sequence', () => {
      expect(() => getNamespaceResourceFilePath('AplNamespaceSealedSecret', 'secret', '..%2Fetc')).toThrow()
    })

    it('rejects a namespace starting with a dot', () => {
      expect(() => getNamespaceResourceFilePath('AplNamespaceSealedSecret', 'secret', '.hidden')).toThrow()
    })

    it('rejects an empty namespace', () => {
      expect(() => getNamespaceResourceFilePath('AplNamespaceSealedSecret', 'secret', '')).toThrow()
    })
  })
})
