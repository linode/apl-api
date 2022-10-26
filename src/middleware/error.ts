/* eslint-disable no-param-reassign */
import { debug, error } from 'console'
import { HttpError, OtomiError } from 'src/error'
import { OpenApiRequest } from 'src/otomi-models'
import { cleanEnv } from 'src/validators'

const env = cleanEnv({})

// Note: 4 arguments (no more, no less) must be defined in your errorMiddleware function. Otherwise the function will be silently ignored.
// eslint-disable-next-line no-unused-vars
export function errorMiddleware(e, req: OpenApiRequest, res, next): void {
  if (env.isDev) error('errorMiddleware error', e)
  else debug('errorMiddleware error', e)
  let code
  let msg
  if (e instanceof OtomiError) {
    code = e.code
    msg = e.publicMessage
  } else {
    code = e.code ?? e.statusCode ?? e.status ?? e.response?.status ?? 500
    const errMsg = e.message ?? e.response?.data
    msg = `${HttpError.fromCode(code).message}`
    if (errMsg) msg += `: ${errMsg}`
  }
  return res.status(code).json({ error: msg })
}
