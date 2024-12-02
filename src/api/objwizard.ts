import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { ObjWizard, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:objwizard')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug('createObjWizard')
      const v = await otomi.createObjWizard(body as ObjWizard)
      res.json(v)
    },
  ]
  const api = {
    post,
  }
  return api
}
