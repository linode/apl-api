import { AplKnowledgeBaseRequest, AplKnowledgeBaseResponse } from 'src/otomi-models'
import { getAIModels } from './aiModelHandler'
import { K8sResourceNotFound } from '../error'
import {
  cleanEnv,
  DB_OWNER,
  EMBED_BATCH_SIZE,
  EMBED_DIM_DEFAULT,
  KNOWLEDGE_BASE_API_VERSION,
  KNOWLEDGE_BASE_KIND,
  PIPELINE_NAME,
} from '../validators'

const env = cleanEnv({
  EMBED_BATCH_SIZE,
  EMBED_DIM_DEFAULT,
  KNOWLEDGE_BASE_API_VERSION,
  KNOWLEDGE_BASE_KIND,
  PIPELINE_NAME,
  DB_OWNER,
})

export class AkamaiKnowledgeBaseCR {
  public apiVersion: string
  public kind: string
  public metadata: {
    name: string
    namespace: string
    labels?: Record<string, string>
  }
  public spec: {
    pipelineName: string
    pipelineParameters: {
      url: string
      tableName: string
      embeddingModel: string
      embeddingApiBase: string
      embedDim: number
      embedBatchSize: number
      secretName: string
      secretNamespace: string
    }
  }

  constructor(
    teamId: string,
    knowledgeBaseName: string,
    clusterName: string,
    request: AplKnowledgeBaseRequest,
    embeddingModel: any,
  ) {
    const namespace = `team-${teamId}`

    this.apiVersion = env.KNOWLEDGE_BASE_API_VERSION
    this.kind = env.KNOWLEDGE_BASE_KIND
    this.metadata = {
      ...request.metadata,
      name: knowledgeBaseName,
      namespace,
    }
    this.spec = {
      pipelineName: env.PIPELINE_NAME,
      pipelineParameters: {
        url: request.spec.sourceUrl,
        tableName: knowledgeBaseName,
        embeddingModel: embeddingModel.metadata.name,
        embeddingApiBase: embeddingModel.spec.modelEndpoint,
        embedDim: embeddingModel.spec.modelDimension || env.EMBED_DIM_DEFAULT,
        embedBatchSize: env.EMBED_BATCH_SIZE,
        secretName: `${clusterName}-${env.DB_OWNER}`,
        secretNamespace: namespace,
      },
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

  // Transform to API response format
  toApiResponse(teamId: string): AplKnowledgeBaseResponse {
    return {
      kind: env.KNOWLEDGE_BASE_KIND as 'AkamaiKnowledgeBase',
      metadata: {
        ...this.metadata,
        labels: {
          'apl.io/teamId': teamId,
        },
      },
      spec: {
        modelName: this.spec.pipelineParameters.embeddingModel,
        sourceUrl: this.spec.pipelineParameters.url,
      },
      status: {},
    }
  }

  // Static factory method
  static async create(
    teamId: string,
    knowledgeBaseName: string,
    clusterName: string,
    request: AplKnowledgeBaseRequest,
  ): Promise<AkamaiKnowledgeBaseCR> {
    const aiModels = await getAIModels()
    const embeddingModel = aiModels.find(
      (model) => model.metadata.name === request.spec.modelName && model.spec.modelType === 'embedding',
    )

    if (!embeddingModel) {
      throw new K8sResourceNotFound('Embedding model', `Embedding model '${request.spec.modelName}' not found`)
    }

    return new AkamaiKnowledgeBaseCR(teamId, knowledgeBaseName, clusterName, request, embeddingModel)
  }

  // Static method to create from existing CR (for transformation)
  static fromCR(cr: any): AkamaiKnowledgeBaseCR {
    const instance = Object.create(AkamaiKnowledgeBaseCR.prototype)
    return Object.assign(instance, cr)
  }
}
