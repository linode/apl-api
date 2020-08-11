import { Operation } from 'express-openapi'
import yaml from 'js-yaml'
import { KubeConfig } from '@kubernetes/client-node'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export const parameters = []

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    async ({ params: { teamId } }: OpenApiRequest, res) => {
      console.debug(`Trigger download: ${JSON.stringify({ teamId })}`)
      // trigger creation of file
      const config: KubeConfig = await otomi.getKubecfg(teamId)
      const yamlConfig = yaml.safeDump(JSON.parse(config.exportConfig()))
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
