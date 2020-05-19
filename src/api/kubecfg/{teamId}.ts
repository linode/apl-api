import { Operation } from 'express-openapi'
import yaml from 'js-yaml'
import { KubeConfig } from '@kubernetes/client-node'

export const parameters = []

export default function (otomi) {
  const GET: Operation = [
    async (req, res) => {
      console.debug(`Trigger download: ${JSON.stringify(req.params)}`)
      const { teamId } = req.params
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
