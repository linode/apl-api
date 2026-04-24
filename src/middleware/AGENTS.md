# Middleware

## OVERVIEW

Express middleware chain: JWT verification → group extraction → CASL authorization → session/stack injection → error handling.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Auth flow | `jwt.ts` → `security-handlers.ts` → `authz.ts` | Sequential pipeline |
| Session/stack | `session.ts` | Attaches `OtomiStack` to `req.otomi` |
| Error handling | `error.ts` | Express error middleware, formats HttpError responses |
| Rate limiting | `rate-limit.ts` | Separate limiters for API and auth routes |
| Add middleware | New file → export from `index.ts` → register in `src/app.ts` |

## KEY FILES

- **`jwt.ts`**: Validates JWT tokens, extracts user identity. Uses JWKS for key rotation.
- **`security-handlers.ts`**: `groupAuthzSecurityHandler` — extracts groups from `Auth-Group` header, resolves role (platformAdmin/teamAdmin/teamMember).
- **`authz.ts`**: CASL ability check against `x-acl` from OpenAPI spec. Runs per-request.
- **`session.ts`**: Creates/retrieves `OtomiStack` instance, attaches to request as `req.otomi`.
- **`error.ts`**: Catches errors, maps to HTTP status codes, formats JSON response.
- **`rate-limit.ts`**: `apiRateLimiter` and `authRateLimiter` — separate limits, not exported via `index.ts`.

## ANTI-PATTERNS

- **DO NOT** import `rate-limit.ts` from `index.ts` — it's imported directly in `app.ts`
- **DO NOT** bypass the middleware chain — auth headers (`Authorization`, `Auth-Group`) are required
