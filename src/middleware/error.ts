import { debug, error } from 'console'
import { Response } from 'express'
import { HttpError, OtomiError } from 'src/error'
import { OpenApiRequest } from 'src/otomi-models'
import { cleanEnv } from 'src/validators'
import { cleanSession } from './session'

const env = cleanEnv({})

// Note: 4 arguments (no more, no less) must be defined in your errorMiddleware function. Otherwise the function will be silently ignored.

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
  } else if (code === 400 && e?.errors?.length > 0) {
    // Handle both express-openapi and express-openapi-validator validation errors
    const errorCode = e?.errors[0]?.errorCode || ''
    if (errorCode.includes('openapi.requestValidation') || errorCode.includes('request')) {
      const requiredProperties = e?.errors.map((item: any) => item?.path || item?.dataPath).join(', ')
      msg = `Required property missing! '${requiredProperties}'`
    } else if (e?.errors[0]?.message) {
      // express-openapi-validator format
      msg = e.errors.map((err: any) => err.message).join(', ')
    }
  }
  const { otomi } = req as any
  if (otomi?.sessionId && otomi?.sessionId !== 'main') cleanSession(otomi.sessionId as string)
  res.status(code).json({ error: msg })
}
