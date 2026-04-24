# OpenAPI Specifications

## OVERVIEW

YAML specs defining all API endpoints, schemas, ACLs, and documentation links. Single source of truth for the entire API surface.

## STRUCTURE

```
openapi/
├── api.yaml          # Main spec: ALL path definitions + component refs (3k lines)
├── definitions.yaml  # Shared schema fragments (idName, etc.)
├── error.yaml        # Error response schemas
├── otomi/            # Otomi-specific sub-specs
└── *.yaml            # One file per resource schema (service, team, workload, etc.)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add endpoint path | `api.yaml` paths section | Must include `operationId` + `x-eov-operation-handler` |
| Define resource schema | New `{resource}.yaml` + ref from `api.yaml` | One schema file per resource |
| Set authorization | Schema file `x-acl` block | Per-role CRUD permissions |
| Field-level ACL | Schema property `x-acl` | Restricts field visibility by role |
| Shared types | `definitions.yaml` | Reusable schema fragments |

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
