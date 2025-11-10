import { KubeConfig } from '@kubernetes/client-node'
import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'
import { stringify as stringifyYaml } from 'yaml'

const debug = Debug('otomi:api:v1:kubecfg')

export const parameters = []

/**
 * GET /v1/kubecfg/{teamId}
 * Get kubeconfig for a team
 */
export const getKubecfg = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`getKubecfg(${teamId})`)
  // trigger creation of file
  const config: KubeConfig = await req.otomi.getKubecfg(teamId)
  const exportedConfig = config.exportConfig()
  const yamlConfig = stringifyYaml(JSON.parse(exportedConfig))
  res.setHeader('Content-type', 'application/yaml')
  res.setHeader('Content-Disposition', `attachment; filename=kubecfg-team-${teamId}.yaml`)
  res.send(yamlConfig)
}
