import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Settings } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:settings')

/**
 * PUT /v1/settings/{settingId}
 * Edit settings
 */
export const editSettings = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { settingId } = req.params
  const ids = Object.keys(req.body as Settings)
  debug(`editSettings(${ids.join(',')})`)
  const v = await req.otomi.editSettings(req.body as Settings, settingId)
  res.json(v)
}
