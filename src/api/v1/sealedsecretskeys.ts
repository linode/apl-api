import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { getSealedSecretsKeys } from 'src/k8s_operations'
import YAML from 'yaml'

const debug = Debug('otomi:api:v1:sealedsecrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async (req, res): Promise<void> => {
      debug(`getSealedSecretsKeys`)
      const keys = await getSealedSecretsKeys()
      if (keys?.items?.length === 0) throw new Error('Sealed Secrets Keys not found')
      const sealedSecretsKeys = YAML.stringify(keys)
      const dateTime = new Date().toISOString()
      res.setHeader('Content-Type', 'application/key')
      res.setHeader('Content-Disposition', `attachment; filename=sealed-secrets-main-${dateTime}.key`)
      res.send(sealedSecretsKeys)
    },
  ]
  const api = {
    get,
  }
  return api
}
