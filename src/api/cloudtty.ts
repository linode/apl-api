import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:cloudtty')

export default function (): OperationHandlerArray {
  const post: Operation = [
    ({ otomi, body }: OpenApiRequestExt, res): void => {
      debug(`connectCloudtty`)
      const v = otomi.connectCloudtty(body)
      const myData = { iFrameUrl: 'https://www.youtube.com/embed/Lxy9uA_J2OM', ...body }
      res.json(myData)
    },
  ]
  const api = {
    post,
  }
  return api
}
