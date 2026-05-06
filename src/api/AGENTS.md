# API Route Handlers

## OVERVIEW

Versioned REST endpoint handlers. Each file exports functions matching OpenAPI `operationId`s.

## STRUCTURE

```
api/
├── v1/              # Legacy handlers — (req, res) signature, call req.otomi.*
├── v2/              # Current handlers — (req, res) signature, call req.otomi.*Apl*
│   └── teams/{teamId}/ # Team-scoped with sub-resource dirs
├── alpha/           # Experimental (AI features, team extensions)
│   ├── ai/          # Deprecated
│   └── teams/       # Deprecated
└── apiDocs.ts       # Swagger UI endpoint
```

## CONVENTIONS

- **v2 handlers**: `export const opId = (req: OpenApiRequestExt, res: Response): void` — call `req.otomi.*Apl*()`, send via `res.json()`

## ANTI-PATTERNS

- **DO NOT** put business logic in handlers — delegate to `req.otomi` (OtomiStack)
- **DO NOT** create handler files without corresponding OpenAPI spec entry
