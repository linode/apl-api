## OVERVIEW

App Platform API — Express/TypeScript REST API managing Kubernetes teams, workloads, and services. Uses **Git as database** (YAML files in a values repo).

## CONVENTIONS

- **OpenAPI-first**: Never add routes manually. Define in YAML spec, implement handler matching `operationId`
- **Handler signature (all versions)**: `export const opId = (req: OpenApiRequestExt, res: Response): void` — send via `res.json()`
- **Path params use curly braces in filesystem**: `src/api/v1/teams/{teamId}/services.ts` — Express resolves `:teamId`

## Deprecations

- /v1 is deprecated, new endpoints implemented in /v2
- src/ai not used

## KEY PATTERNS

- **Git-as-Database**: CRUD → OtomiStack → FileStore (memory) + Git (disk) → commit → deploy
- **Multi-tenant isolation**: Team resources scoped by `teamId` in paths and CASL abilities
- **OpenAPI validation**: express-openapi-validator validates all requests/responses against specs
- **FileStore path mapping**: FileMap defines glob patterns + templates per AplKind (e.g., `env/teams/{teamId}/services/{name}.yaml`)

## ANTI-PATTERNS

- **DO NOT** edit `src/generated-schema.ts` — auto-generated from `npm run build:models`
- **DO NOT** add routes without OpenAPI spec — express-openapi-validator rejects unspecified routes
