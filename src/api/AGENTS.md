# API Route Handlers

## OVERVIEW

Versioned REST endpoint handlers. Each file exports functions matching OpenAPI `operationId`s.

## STRUCTURE

```
api/
├── v1/              # Legacy handlers — (req, res) signature, call req.otomi.*
│   ├── teams/       # Team-scoped resources
│   │   └── {teamId}/ # Path param dirs with curly braces
│   ├── apps/        # Platform app configs
│   ├── settings/    # Cluster settings
│   └── *.ts         # Top-level resource handlers
├── v2/              # Current handlers — return AplResponseObject, call req.otomi.*Apl*
│   └── teams/{teamId}/ # Team-scoped with sub-resource dirs
├── alpha/           # Experimental (AI features, team extensions)
│   ├── ai/          # AI model/agent/knowledgebase endpoints
│   └── teams/       # Alpha team features
└── apiDocs.ts       # Swagger UI endpoint
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add v1 endpoint | `v1/` + matching OpenAPI spec | Legacy: `(req, res) => void` |
| Add v2 endpoint | `v2/` + matching OpenAPI spec | Current: `(req) => Promise<AplResponseObject>` |
| Add AI endpoint | `alpha/ai/` | Uses `src/ai/` handlers, not OtomiStack |
| Team-scoped resource | `{version}/teams/{teamId}/` | Dir name literally `{teamId}` |

## CONVENTIONS

- **v1 handlers**: `export const opId = (req: OpenApiRequestExt, res: Response): void` — send response via `res.json()`
- **v2 handlers**: `export async function opId(req: OpenApiRequestExt): Promise<AplResponseObject>` — return value
- **File naming**: Matches resource name (e.g., `services.ts`, `coderepos.ts`)
- **Sub-resource pattern**: Directory for collection, file for item (e.g., `services.ts` = list, `services/{name}.ts` = single)
- **All business logic** lives in `OtomiStack` via `req.otomi.*` — handlers are thin wrappers
- **Debug namespace**: `otomi:api:{version}:{resource}`

## ANTI-PATTERNS

- **DO NOT** put business logic in handlers — delegate to `req.otomi` (OtomiStack)
- **DO NOT** create handler files without corresponding OpenAPI spec entry
- **DO NOT** mix v1/v2 patterns — v1 uses `res.json()`, v2 returns objects
