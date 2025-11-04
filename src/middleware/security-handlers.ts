import { Request } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

/**
 * Security handler for JWT-based authentication (groupAuthz scheme).
 * This handler is called by express-openapi-validator after basic JWT validation.
 * The JWT middleware runs before this and sets req.user if the token is valid.
 *
 * @param req - Express request object (augmented by JWT middleware)
 * @param scopes - Required security scopes from OpenAPI spec
 * @param schema - Security scheme object from OpenAPI spec
 * @returns true if authenticated, throws error otherwise
 */
export async function groupAuthzSecurityHandler(
  req: Request,
  scopes: string[],
  schema: any,
): Promise<boolean> {
  const extReq = req as OpenApiRequestExt

  // JWT middleware already ran and set req.user if token was valid
  if (!extReq.user) {
    throw { status: 401, message: 'Unauthorized - No valid JWT token provided' }
  }

  // Authentication successful
  return true
}
