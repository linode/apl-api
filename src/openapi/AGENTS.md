# OpenAPI Specifications

## OVERVIEW

YAML specs defining all API endpoints, schemas, ACLs, and documentation links. Single source of truth for the entire API surface.

## CONVENTIONS

- **`operationId`**: Must match exported function name in handler file
- **`x-eov-operation-handler`**: Path to handler file relative to `src/api/` (e.g., `v1/teams`)
- **`x-aclSchema`**: References schema name for CASL authorization
- **`x-acl`**: Maps roles to CRUD abilities (`create-any`, `read`, `update`, `delete-any`)
- **`x-formtype`**: UI hint for console form generation (`SelectWidget`, etc.)
- **`x-externalDocsPath`**: Appended to base docs URL for per-resource documentation
- **Schema files** define the resource type at top level (e.g., `Service:` in `service.yaml`)

## ANTI-PATTERNS

- **DO NOT** add paths without `operationId` and `x-eov-operation-handler`
- **DO NOT** define schemas inline in `api.yaml` — create separate `{resource}.yaml`
- **DO NOT** forget `x-aclSchema` — endpoints without it bypass authorization
- After changes: run `npm run build:models` to regenerate `generated-schema.ts`
