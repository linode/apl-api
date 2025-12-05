import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:helmChartContent')

/**
 * GET /v1/helmChartContent
 * Get Helm chart content
 */
export const getHelmChartContent = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug(`gethelmChartContent ${req.query?.url}`)
  const v = await req.otomi.getHelmChartContent(req.query?.url as string)
  res.json(v)
}
