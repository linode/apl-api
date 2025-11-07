import { Request, Response } from 'express'
import { getSpec } from 'src/app'
import Authz, { getTeamSelfServiceAuthz } from 'src/authz'
import { OpenApiRequestExt } from 'src/otomi-models'
import { authorize } from './authz'
import { getSessionStack } from './session'

/**
 * Security handler for JWT-based authentication and authorization (groupAuthz scheme).
 * This handler is called by express-openapi-validator before invoking operation handlers.
 *
 * With express-openapi-validator's operationHandlers, this is the ONLY place where
 * authorization can run before handlers are invoked (middleware registered after
 * the validator is bypassed for operation handlers).
 *
 * @param req - Express request object (augmented by JWT middleware)
 * @param scopes - Required security scopes from OpenAPI spec
 * @param schema - Security scheme object from OpenAPI spec
 * @returns true if authenticated and authorized, throws error otherwise
 */
export async function groupAuthzSecurityHandler(req: Request, scopes: string[], schema: any): Promise<boolean> {
  const extReq = req as OpenApiRequestExt

  // In dev mode, JWT middleware sets a mock user without requiring Authorization header
  // In production, JWT middleware sets req.user only if valid token exists
  // Allow requests to proceed if user was set by JWT middleware
  if (!extReq.user) {
    throw { status: 401, message: 'Unauthorized - No valid JWT token provided' }
  }

  // Mark that security handler was called
  extReq.isSecurityHandler = true

  // Get OtomiStack and set up user authz
  const otomiStack = await getSessionStack(extReq.user.email)
  extReq.user.authz = getTeamSelfServiceAuthz(extReq.user.teams, otomiStack)

  // Perform authorization check
  try {
    const authz = new Authz(getSpec().spec)
    authorize(extReq, authz, otomiStack.repoService)
    return true
  } catch (error: any) {
    // authorize threw an error (e.g., HttpError for 403)
    const status = error.statusCode || error.status || 403
    const message = error.publicMessage || error.message || 'Forbidden'
    throw { status, message }
  }
}
