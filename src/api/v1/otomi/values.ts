import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:otomiValues')

/**
 * GET /v1/otomi/values
 * Get Otomi values
 */
export const getValues = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getValues', req.query)
  const data = await req.otomi.getValues(req.query)
  const dateTime = new Date().toISOString()
  let fileName = `values-${dateTime}.yaml`
  if (req.query?.excludeSecrets === 'true') fileName = `values-redacted-${dateTime}.yaml`
  res.setHeader('Content-type', 'application/yaml')
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
  res.send(data)
}
