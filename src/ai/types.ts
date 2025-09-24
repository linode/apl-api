export interface DatabaseCR extends Record<string, unknown> {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    name: string
    owner: string
    cluster: {
      name: string
    }
    extensions: Array<{ name: string }>
  }
}

export interface AkamaiKnowledgeBaseCR extends Record<string, unknown> {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
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
}
