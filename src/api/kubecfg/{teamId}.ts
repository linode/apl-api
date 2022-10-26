import { KubeConfig } from '@kubernetes/client-node'
import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import yaml from 'js-yaml'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:kubecfg')

export const parameters = []

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, params: { teamId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getKubecfg(${teamId})`)
      // trigger creation of file
      const config: KubeConfig = await otomi.getKubecfg(teamId)
      const exportedConfig = config.exportConfig()
      const yamlConfig = yaml.dump(JSON.parse(exportedConfig))
      res.setHeader('Content-type', 'application/yaml')
      res.setHeader('Content-Disposition', `attachment; filename=kubecfg-team-${teamId}.yaml`)
      res.send(yamlConfig)
    },
  ]
  const api = {
    get,
  }
  return api
}
