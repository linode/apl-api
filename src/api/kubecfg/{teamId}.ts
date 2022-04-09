import { KubeConfig } from '@kubernetes/client-node'
import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import yaml from 'js-yaml'
import { OpenApiRequest } from '../../otomi-models'
import OtomiStack from '../../otomi-stack'

const debug = Debug('otomi:api:kubecfg')

export const parameters = []

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    async ({ params: { teamId } }: OpenApiRequest, res): Promise<void> => {
      debug(`getKubecfg(${teamId})`)
      // trigger creation of file
      const config: KubeConfig = await otomi.getKubecfg(teamId)
      const exportedConfig = config.exportConfig()
      const yamlConfig = yaml.safeDump(JSON.parse(exportedConfig))
      res.setHeader('Content-type', 'application/yaml')
      res.setHeader('Content-Disposition', `attachment; filename=kubecfg-team-${teamId}.yaml`)
      res.send(yamlConfig)
    },
  ]
  const api = {
    GET,
  }
  return api
}
