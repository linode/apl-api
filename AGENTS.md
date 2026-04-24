# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-24

## OVERVIEW

Akamai App Platform API — Express/TypeScript REST API managing Kubernetes teams, workloads, and services. Uses **Git as database** (YAML files in a values repo). OpenAPI-first: specs define endpoints, authorization, and generate types.

## STRUCTURE

```
apl-api/
├── src/
│   ├── app.ts              # Express server setup, middleware chain, OpenAPI validator
│   ├── otomi-stack.ts       # Core business logic engine (2600+ lines) — ALL CRUD goes through here
│   ├── otomi-models.ts      # Domain types: AplObject, AplTeamObject, AplRequestObject
│   ├── authz.ts             # CASL-based RBAC (platformAdmin, teamAdmin, teamMember)
│   ├── generated-schema.ts  # AUTO-GENERATED from OpenAPI — DO NOT EDIT (24k lines)
│   ├── git.ts               # Git operations for values repo persistence
│   ├── error.ts             # Custom error classes (HttpError, ValidationError)
│   ├── validators.ts        # Environment variable validation (envalid)
│   ├── constants.ts         # Shared constants
│   ├── api/                 # Route handlers (v1/, v2/, alpha/) — see AGENTS.md
│   ├── openapi/             # OpenAPI YAML specs — see AGENTS.md
│   ├── middleware/           # JWT, authz, session, rate-limit — see AGENTS.md
│   ├── ai/                  # AI model/agent/knowledgebase CRD handlers — see AGENTS.md
│   ├── utils/               # Domain utilities (workload, codeRepo, user, YAML, sealed secrets)
│   ├── fileStore/            # In-memory cache over Git storage (see ARCHITECTURE.md)
│   ├── ttyManifests/         # CloudTTY manifest templates
│   ├── gitea/                # Gitea integration for commit monitoring
│   └── fixtures/             # Test fixtures
├── test/                    # Helm chart for deployment testing (NOT unit tests)
├── bin/                     # Shell scripts (client gen, releases)
├── docs/                    # Additional documentation
└── ARCHITECTURE.md          # FileStore architecture diagrams (Mermaid)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new endpoint | `src/openapi/*.yaml` → `src/api/{version}/` | Define spec FIRST, then handler |
| Add authorization | OpenAPI spec `x-acl` + `x-aclSchema` | ACLs live in YAML, not code |
| Understand CRUD flow | `src/otomi-stack.ts` | All resource operations route here |
| Add middleware | `src/middleware/` → register in `src/app.ts` | Export from `middleware/index.ts` |
| Modify data models | `src/openapi/*.yaml` → `npm run build:models` | Generates `generated-schema.ts` |
| Secret handling | `src/fileStore/` + `ARCHITECTURE.md` | Secrets split on disk, merged in memory |
| K8s operations | `src/k8s_operations.ts` | Pod status, logs, builds |
| Auth flow | `src/middleware/jwt.ts` → `src/middleware/authz.ts` | JWT → group extraction → CASL check |
| AI features | `src/ai/` | Kubernetes CRD CRUD for AI resources |
| Environment config | `src/validators.ts` + `.env.sample` | All env vars validated via envalid |

## CONVENTIONS

- **No semicolons**, single quotes, trailing commas, 120 char width (Prettier)
- **OpenAPI-first**: Never add routes manually. Define in YAML spec, implement handler matching `operationId`
- **Handler signature**: `export async function operationId(req: OpenApiRequestExt): Promise<AplResponseObject>`
- **Path params use curly braces in filesystem**: `src/api/v1/teams/{teamId}/services.ts` — Express resolves `:teamId`
- **Imports use `src/` prefix**: `import { ... } from 'src/middleware'` (tsconfig paths)
- **Debug logging**: `const debug = Debug('otomi:<module>')` — namespaced debug
- **Conventional commits** enforced via commitlint + Husky
- **YAML tab indentation** in test files (width 4)

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** edit `src/generated-schema.ts` — auto-generated from `npm run build:models`
- **DO NOT** add routes without OpenAPI spec — express-openapi-validator rejects unspecified routes
- **DO NOT** bypass `OtomiStack` for data operations — it manages FileStore + Git + deployment sync
- **DO NOT** store secrets in main YAML files — use `secrets.*` file pattern (see ARCHITECTURE.md)

## KEY PATTERNS

- **Git-as-Database**: CRUD → OtomiStack → FileStore (memory) + Git (disk) → commit → deploy
- **Secret splitting**: Main spec on disk without secrets; `secrets.*.yaml` holds sensitive fields; merged in memory
- **Multi-tenant isolation**: Team resources scoped by `teamId` in paths and CASL abilities
- **WebSocket updates**: Socket.io for real-time status (builds, workloads, services, sealed secrets)
- **OpenAPI validation**: express-openapi-validator validates all requests/responses against specs

## COMMANDS

```bash
npm run dev              # Dev server with hot reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm run build:models     # Generate TS types from OpenAPI specs
npm run build:spec       # Build combined OpenAPI spec
npm test                 # Jest tests
npm run test:pattern -- X  # Run specific test
npm run lint             # ESLint + type check
npm run lint:fix         # Auto-fix
npm run types            # Type check only
```

## NOTES

- `otomi-stack.ts` is 2600+ lines — the monolith. All resource CRUD funnels through it.
- `generated-schema.ts` is 24k+ lines — expect slow IDE. Never read fully, grep for specific types.
- Node 24+ required (see `.nvmrc` and `package.json` engines).
- Test directory contains Helm charts, not typical unit tests. Unit tests are colocated as `*.test.ts` in `src/`.
- `.history/` directory exists (VSCode local history) — ignore it.
- Mock auth available at `GET /api/mock/{idx}` for development.
- Every API mutation commits to the values Git repo with the author's email.
