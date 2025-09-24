import { AplKnowledgeBaseRequest, AplKnowledgeBaseResponse } from 'src/otomi-models'
import { getAIModels } from './aiModelHandler'
import { getKnowledgeBaseCNPGClusters } from './k8s'
import { AkamaiKnowledgeBaseCR, DatabaseCR } from './types'
import {
  cleanEnv,
  DATABASE_API_VERSION,
  DATABASE_KIND,
  DB_OWNER,
  KNOWLEDGE_BASE_API_VERSION,
  KNOWLEDGE_BASE_KIND,
  PIPELINE_NAME,
} from '../validators'
import { K8sResourceNotFound } from '../error'

const env = cleanEnv({
  PIPELINE_NAME,
  KNOWLEDGE_BASE_API_VERSION,
  KNOWLEDGE_BASE_KIND,
  DATABASE_API_VERSION,
  DATABASE_KIND,
  DB_OWNER,
})

export async function generateDatabaseCR(teamId: string, knowledgeBaseName: string): Promise<DatabaseCR> {
  const namespace = `team-${teamId}`

  // Get CNPG clusters with knowledge-base label
  const clusters = await getKnowledgeBaseCNPGClusters()
  if (clusters.length === 0) {
    throw new K8sResourceNotFound(
      'CNPGCluster',
      'No CNPG cluster found with label apl.akamai.com/purpose=knowledge-base',
    )
  }
  const clusterName = clusters[0].metadata?.name || 'pgvector'

  return {
    apiVersion: env.DATABASE_API_VERSION,
    kind: env.DATABASE_KIND,
    metadata: {
      name: knowledgeBaseName,
      namespace,
    },
    spec: {
      name: knowledgeBaseName,
      owner: env.DB_OWNER,
      cluster: {
        name: clusterName,
      },
      extensions: [{ name: 'pgvector' }, { name: 'pg_stat_statements' }],
    },
  }
}

/**
 * Generate an AkamaiKnowledgeBase CR with model data from AI models API
 */
export async function generateKnowledgeBaseCR(
  teamId: string,
  knowledgeBaseName: string,
  dbName: string,
  request: AplKnowledgeBaseRequest,
): Promise<AkamaiKnowledgeBaseCR> {
  const namespace = `team-${teamId}`
  const { spec } = request
  const { metadata } = request

  // Fetch AI models to get model details
  const aiModels = await getAIModels()
  const embeddingModel = aiModels.find(
    (model) => model.metadata.name === spec.modelName && model.spec.modelType === 'embedding',
  )

  if (!embeddingModel) {
    throw new K8sResourceNotFound('Embedding model', `Embedding model '${spec.modelName}' not found`)
  }

  return {
    apiVersion: env.KNOWLEDGE_BASE_API_VERSION,
    kind: env.KNOWLEDGE_BASE_KIND,
    metadata: {
      ...metadata,
      name: knowledgeBaseName,
      namespace,
    },
    spec: {
      pipelineName: env.PIPELINE_NAME,
      pipelineParameters: {
        url: spec.sourceUrl,
        tableName: knowledgeBaseName,
        embeddingModel: embeddingModel.metadata.name,
        embeddingApiBase: embeddingModel.spec.modelEndpoint,
        embedDim: embeddingModel.spec.modelDimension || 1536,
        embedBatchSize: 10,
        secretName: `${dbName}-${env.DB_OWNER}`,
        secretNamespace: namespace,
      },
    },
  }
}

export function transformKnowledgeBaseCRToResponse(
  cr: AkamaiKnowledgeBaseCR,
  teamId: string,
): AplKnowledgeBaseResponse {
  return {
    kind: env.KNOWLEDGE_BASE_KIND as 'AkamaiKnowledgeBase',
    metadata: {
      ...cr.metadata,
      labels: {
        'apl.io/teamId': teamId,
      },
    },
    spec: {
      modelName: cr.spec.pipelineParameters.embeddingModel,
      sourceUrl: cr.spec.pipelineParameters.url,
    },
    status: {},
  }
}

export async function transformKnowledgeBaseData(
  teamId: string,
  knowledgeBaseName: string,
  request: AplKnowledgeBaseRequest,
): Promise<{
  knowledgeBaseCR: AkamaiKnowledgeBaseCR
  databaseCR: DatabaseCR
}> {
  const databaseCR = await generateDatabaseCR(teamId, knowledgeBaseName)
  const knowledgeBaseCR = await generateKnowledgeBaseCR(teamId, knowledgeBaseName, databaseCR.spec.name, request)

  return {
    knowledgeBaseCR,
    databaseCR,
  }
}
