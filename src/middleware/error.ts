/* eslint-disable no-param-reassign */
import { debug, error } from 'console'
import { Response } from 'express'
import { HttpError, OtomiError } from 'src/error'
import { OpenApiRequest } from 'src/otomi-models'
import { cleanEnv } from 'src/validators'

const env = cleanEnv({})

// Note: 4 arguments (no more, no less) must be defined in your errorMiddleware function. Otherwise the function will be silently ignored.
// eslint-disable-next-line no-unused-vars
export function errorMiddleware(e, req: OpenApiRequest, res: Response, next): void {
  if (env.isDev) error('errorMiddleware error', e)
  else debug('errorMiddleware error', e)
  let code: number = e.code ?? e.statusCode ?? e.status ?? e.response?.status ?? 500
  let msg: string = e.message ?? e.response?.data
  if (e instanceof OtomiError) {
    // eslint-disable-next-line prefer-destructuring
    code = e.code
    msg = e.publicMessage
    if (code === 503) res.header({ 'Retry-After': '30' })
  } else if (Number.isNaN(Number(code))) {
    code = 500
    msg = `${HttpError.fromCode(500).message}`
  } else if (e?.errors[0].errorCode === 'required.openapi.requestValidation') {
    const requiredProperties = e?.errors.map((item: any) => item?.path).join(', ')
    msg = `Required property missing! '${requiredProperties}'`
  }
  res.status(code).json({ error: msg })
}
