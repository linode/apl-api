import Debug from 'debug'
import { Response } from 'express'
import { ObjWizard, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:objwizard')

/**
 * POST /v1/objwizard
 * Create object wizard
 */
export const createObjWizard = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('createObjWizard')
  const v = await req.otomi.createObjWizard(req.body as ObjWizard)
  res.json(v)
}
