import { Operation } from 'express-openapi'

export const parameters = []

export default function (otomi) {
  const GET: Operation = [
    async (req, res) => {
      console.debug(`Trigger download: ${JSON.stringify(req.params)}`)
      const teamId = req.header('Auth-Group')
      // trigger creation of file
      await otomi.downloadKubecfg(teamId)
      res.setHeader('Content-type', 'application/yaml')
      res.download(`/tmp/kube/k8s-default-${teamId}-conf`, 'kubecfg.yaml', (err) => {
        if (err) console.error(err)
      })
    },
  ]
  const api = {
    GET,
  }
  return api
}
