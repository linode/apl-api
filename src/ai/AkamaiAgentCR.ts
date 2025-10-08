import { AplAgentRequest, AplAgentResponse } from 'src/otomi-models'
import { AGENT_API_VERSION, AGENT_KIND, cleanEnv } from '../validators'
import { K8sResourceNotFound } from '../error'
import { getAIModels } from './aiModelHandler'

const env = cleanEnv({
  AGENT_API_VERSION,
  AGENT_KIND,
})

export class AkamaiAgentCR {
  public apiVersion: string
  public kind: string
  public metadata: {
    name: string
    namespace: string
    labels?: Record<string, string>
  }
  public spec: {
    foundationModel: string
    agentInstructions: string
    knowledgeBase?: string
  }

  constructor(teamId: string, agentName: string, request: AplAgentRequest) {
    const namespace = `team-${teamId}`

    this.apiVersion = env.AGENT_API_VERSION
    this.kind = env.AGENT_KIND
    this.metadata = {
      ...request.metadata,
      name: agentName,
      namespace,
      labels: {
        'apl.io/teamId': teamId,
      },
    }
    this.spec = {
      foundationModel: request.spec.foundationModel,
      agentInstructions: request.spec.agentInstructions,
      knowledgeBase: request.spec.knowledgeBase,
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
  toApiResponse(teamId: string): AplAgentResponse {
    return {
      kind: 'AkamaiAgent',
      metadata: {
        ...this.metadata,
        labels: {
          'apl.io/teamId': teamId,
          ...(this.metadata.labels || {}),
        },
      },
      spec: {
        foundationModel: this.spec.foundationModel,
        agentInstructions: this.spec.agentInstructions,
        knowledgeBase: this.spec.knowledgeBase || '',
      },
      status: {
        conditions: [
          {
            type: 'AgentDeployed',
            status: true,
            reason: 'Scheduled',
            message: 'Successfully deployed the Agent',
          },
        ],
      },
    }
  }

  // Static factory method
  static async create(teamId: string, agentName: string, request: AplAgentRequest): Promise<AkamaiAgentCR> {
    const aiModels = await getAIModels()
    const embeddingModel = aiModels.find(
      (model) => model.metadata.name === request.spec.foundationModel && model.spec.modelType === 'foundation',
    )

    if (!embeddingModel) {
      throw new K8sResourceNotFound('Foundation model', `Foundation model '${request.spec.foundationModel}' not found`)
    }

    return new AkamaiAgentCR(teamId, agentName, request)
  }

  // Static method to create from existing CR (for transformation)
  static fromCR(cr: any): AkamaiAgentCR {
    const instance = Object.create(AkamaiAgentCR.prototype)
    return Object.assign(instance, cr)
  }
}
