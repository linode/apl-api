import { getKnowledgeBaseCNPGClusters } from './k8s'
import { K8sResourceNotFound } from '../error'
import { cleanEnv, DATABASE_API_VERSION, DATABASE_KIND, DB_OWNER } from '../validators'

const env = cleanEnv({
  DATABASE_API_VERSION,
  DATABASE_KIND,
  DB_OWNER,
})

export class DatabaseCR {
  public apiVersion: string
  public kind: string
  public metadata: {
    name: string
    namespace: string
  }
  public spec: {
    name: string
    owner: string
    cluster: { name: string }
    extensions: Array<{ name: string }>
  }

  constructor(teamId: string, knowledgeBaseName: string, clusterName: string) {
    this.apiVersion = env.DATABASE_API_VERSION
    this.kind = env.DATABASE_KIND
    this.metadata = {
      name: knowledgeBaseName,
      namespace: `team-${teamId}`,
    }
    this.spec = {
      name: knowledgeBaseName,
      owner: env.DB_OWNER,
      cluster: { name: clusterName },
      extensions: [{ name: 'vector' }, { name: 'pg_stat_statements' }],
    }
  }

  // Convert to plain object for serialization
  toRecord(): Record<string, any> {
    return {
      apiVersion: this.apiVersion,
      kind: this.kind,
      metadata: this.metadata,
      spec: this.spec,
    }
  }

  // Static factory method
  static async create(teamId: string, knowledgeBaseName: string): Promise<DatabaseCR> {
    const clusters = await getKnowledgeBaseCNPGClusters()
    if (clusters.length === 0) {
      throw new K8sResourceNotFound(
        'CNPGCluster',
        'No CNPG cluster found with label apl.akamai.com/purpose=knowledge-base',
      )
    }
    const clusterName = clusters[0].metadata?.name || 'pgvector'
    return new DatabaseCR(teamId, knowledgeBaseName, clusterName)
  }
}
