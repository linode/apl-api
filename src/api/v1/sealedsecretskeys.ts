import Debug from 'debug'
import { Request, Response } from 'express'
import { getSealedSecretsKeys } from 'src/k8s_operations'
import YAML from 'yaml'

const debug = Debug('otomi:api:v1:sealedsecrets')

/**
 * GET /v1/sealedsecretskeys
 * Get sealed secrets keys
 */
export const getSealedSecretKeys = async (req: Request, res: Response): Promise<void> => {
  debug('getSealedSecretsKeys')
  const keys = await getSealedSecretsKeys()
  if (keys?.items?.length === 0) throw new Error('Sealed Secrets Keys not found')
  const sealedSecretsKeys = YAML.stringify(keys)
  const dateTime = new Date().toISOString()
  res.setHeader('Content-Type', 'application/key')
  res.setHeader('Content-Disposition', `attachment; filename=sealed-secrets-main-${dateTime}.key`)
  res.send(sealedSecretsKeys)
}
