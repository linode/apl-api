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
    tools?: Array<{
      type: string
      name: string
      description?: string
      endpoint?: string
    }>
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
      tools: request.spec.tools?.map((tool) => ({
        type: tool.type,
        name: tool.name,
        description:
          tool.description ||
          (tool.type === 'knowledgeBase'
            ? `Search the ${tool.name} knowledge base for relevant information. Use this when you need factual information, documentation, or specific details stored in the knowledge base.`
            : undefined),
        endpoint: tool.endpoint,
      })),
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
        tools: this.spec.tools?.map((tool) => ({
          type: tool.type,
          name: tool.name,
          ...(tool.description && { description: tool.description }),
          ...(tool.endpoint && { endpoint: tool.endpoint }),
        })),
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
