import { DatabaseCR } from './DatabaseCR'
import { K8sResourceNotFound } from '../error'
import * as k8s from './k8s'

// Mock the k8s module
jest.mock('./k8s')
const mockedGetKnowledgeBaseCNPGClusters = k8s.getKnowledgeBaseCNPGClusters as jest.MockedFunction<
  typeof k8s.getKnowledgeBaseCNPGClusters
>

describe('DatabaseCR', () => {
  const mockCNPGCluster = {
    metadata: {
      name: 'pgvector-cluster',
      namespace: 'postgresql',
      labels: {
        'apl.akamai.com/purpose': 'knowledge-base',
      },
    },
    spec: {
      instances: 1,
      postgresql: {
        parameters: {
          max_connections: '100',
        },
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('should create DatabaseCR with all properties', () => {
      const dbCR = new DatabaseCR('team-123', 'test-kb', 'pgvector-cluster')

      expect(dbCR.apiVersion).toBeDefined()
      expect(dbCR.kind).toBeDefined()
      expect(dbCR.metadata.name).toBe('test-kb')
      expect(dbCR.metadata.namespace).toBe('team-team-123')
      expect(dbCR.spec.name).toBe('test-kb')
      expect(dbCR.spec.owner).toBeDefined()
      expect(dbCR.spec.cluster.name).toBe('pgvector-cluster')
      expect(dbCR.spec.extensions).toBeDefined()
    })

    test('should set required PostgreSQL extensions', () => {
      const dbCR = new DatabaseCR('team-123', 'test-kb', 'cluster-name')

      expect(dbCR.spec.extensions).toEqual([{ name: 'vector' }, { name: 'pg_stat_statements' }])
    })

    test('should use environment variable for owner', () => {
      const dbCR = new DatabaseCR('team-123', 'test-kb', 'cluster-name')

      expect(dbCR.spec.owner).toBeDefined()
      expect(typeof dbCR.spec.owner).toBe('string')
    })
  })

  describe('toRecord', () => {
    test('should return serializable record', () => {
      const dbCR = new DatabaseCR('team-123', 'test-kb', 'cluster-name')
      const record = dbCR.toRecord()

      expect(record).toEqual({
        apiVersion: dbCR.apiVersion,
        kind: dbCR.kind,
        metadata: dbCR.metadata,
        spec: dbCR.spec,
      })
    })

    test('should return object with correct structure', () => {
      const dbCR = new DatabaseCR('team-123', 'test-kb', 'cluster-name')
      const record = dbCR.toRecord()

      expect(record).toHaveProperty('apiVersion')
      expect(record).toHaveProperty('kind')
      expect(record).toHaveProperty('metadata')
      expect(record).toHaveProperty('spec')
      expect(record.metadata).toHaveProperty('name')
      expect(record.metadata).toHaveProperty('namespace')
      expect(record.spec).toHaveProperty('name')
      expect(record.spec).toHaveProperty('owner')
      expect(record.spec).toHaveProperty('cluster')
      expect(record.spec).toHaveProperty('extensions')
    })
  })

  describe('create', () => {
    test('should create DatabaseCR when CNPG cluster exists', async () => {
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([mockCNPGCluster])

      const result = await DatabaseCR.create('team-123', 'test-kb')

      expect(result).toBeInstanceOf(DatabaseCR)
      expect(result.metadata.name).toBe('test-kb')
      expect(result.spec.cluster.name).toBe('pgvector-cluster')
      expect(mockedGetKnowledgeBaseCNPGClusters).toHaveBeenCalledTimes(1)
    })

    test('should use first cluster when multiple clusters exist', async () => {
      const secondCluster = {
        ...mockCNPGCluster,
        metadata: {
          ...mockCNPGCluster.metadata,
          name: 'second-cluster',
        },
      }
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([mockCNPGCluster, secondCluster])

      const result = await DatabaseCR.create('team-123', 'test-kb')

      expect(result.spec.cluster.name).toBe('pgvector-cluster')
    })

    test('should throw K8sResourceNotFound when no CNPG clusters found', async () => {
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([])

      await expect(DatabaseCR.create('team-123', 'test-kb')).rejects.toThrow(K8sResourceNotFound)
      await expect(DatabaseCR.create('team-123', 'test-kb')).rejects.toThrow(
        'No CNPG cluster found with label apl.akamai.com/purpose=knowledge-base',
      )
    })

    test('should use default cluster name when cluster metadata name is missing', async () => {
      const clusterWithoutName = {
        ...mockCNPGCluster,
        metadata: {
          ...mockCNPGCluster.metadata,
          name: undefined,
        },
      }
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([clusterWithoutName])

      const result = await DatabaseCR.create('team-123', 'test-kb')

      expect(result.spec.cluster.name).toBe('pgvector')
    })

    test('should handle K8s API errors', async () => {
      const error = new Error('K8s API connection failed')
      mockedGetKnowledgeBaseCNPGClusters.mockRejectedValue(error)

      await expect(DatabaseCR.create('team-123', 'test-kb')).rejects.toThrow('K8s API connection failed')
    })

    test('should create correct namespace for team', async () => {
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([mockCNPGCluster])

      const result = await DatabaseCR.create('team-456', 'my-knowledge-base')

      expect(result.metadata.namespace).toBe('team-team-456')
    })

    test('should preserve knowledge base name in database spec', async () => {
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([mockCNPGCluster])

      const result = await DatabaseCR.create('team-123', 'my-custom-kb-name')

      expect(result.metadata.name).toBe('my-custom-kb-name')
      expect(result.spec.name).toBe('my-custom-kb-name')
    })
  })

  describe('integration', () => {
    test('should create valid database CR that can be serialized', async () => {
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([mockCNPGCluster])

      const dbCR = await DatabaseCR.create('team-123', 'test-kb')
      const record = dbCR.toRecord()

      // Verify the record can be JSON serialized (common requirement for K8s resources)
      expect(() => JSON.stringify(record)).not.toThrow()

      const serialized = JSON.stringify(record)
      const parsed = JSON.parse(serialized)

      expect(parsed.metadata.name).toBe('test-kb')
      expect(parsed.spec.cluster.name).toBe('pgvector-cluster')
      expect(parsed.spec.extensions).toHaveLength(2)
    })

    test('should create database CR with consistent team-based naming', async () => {
      mockedGetKnowledgeBaseCNPGClusters.mockResolvedValue([mockCNPGCluster])

      const teamId = 'production-team'
      const kbName = 'company-docs'

      const dbCR = await DatabaseCR.create(teamId, kbName)

      expect(dbCR.metadata.namespace).toBe(`team-${teamId}`)
      expect(dbCR.metadata.name).toBe(kbName)
      expect(dbCR.spec.name).toBe(kbName)
    })
  })
})
