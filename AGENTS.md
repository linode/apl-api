# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-04

## OVERVIEW

Akamai App Platform API — Express/TypeScript REST API managing Kubernetes teams, workloads, and services. Uses **Git as database** (YAML files in a values repo). OpenAPI-first: specs define endpoints, authorization, and generate types.

## STRUCTURE

```
apl-api/
├── src/
│   ├── app.ts              # Express server setup, middleware chain, OpenAPI validator
│   ├── otomi-stack.ts       # Core business logic engine (2600+ lines) — ALL CRUD goes through here
│   ├── otomi-models.ts      # Domain types: AplObject, AplTeamObject, APL_KINDS (31 resource types)
│   ├── authz.ts             # CASL-based RBAC (platformAdmin, teamAdmin, teamMember) — uses deprecated Ability, TODO replace
│   ├── generated-schema.ts  # AUTO-GENERATED from OpenAPI — DO NOT EDIT (27k lines)
│   ├── git.ts               # Git operations for values repo persistence
│   ├── error.ts             # Custom error classes (HttpError, ValidationError)
│   ├── validators.ts        # Environment variable validation (envalid)
│   ├── constants.ts         # Shared constants
│   ├── k8s-operations.ts    # K8s pod status, logs, builds, sealed secrets (607 lines)
│   ├── jwt-verification.ts  # JWT token verification, JWKS readiness
│   ├── tty.ts               # CloudTTY terminal session management (414 lines)
│   ├── build-spec.ts        # Combines OpenAPI YAMLs into generated-schema.json
│   ├── mocks.ts             # Mock user utilities for dev/testing
│   ├── playground.ts        # Development experimentation
│   ├── api/                 # Route handlers (v1/, v2/, alpha/) — see src/api/AGENTS.md
│   ├── openapi/             # OpenAPI YAML specs — see src/openapi/AGENTS.md
│   ├── middleware/           # JWT, authz, session, rate-limit — see src/middleware/AGENTS.md
│   ├── ai/                  # AI model/agent/knowledgebase CRD handlers — see src/ai/AGENTS.md
│   ├── utils/               # Domain utilities — see src/utils/AGENTS.md
│   ├── fileStore/            # In-memory cache over Git storage (see ARCHITECTURE.md)
│   ├── ttyManifests/         # CloudTTY manifest templates
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
| Secret handling | `src/fileStore/` + `ARCHITECTURE.md` | Two-pass loading: YAML first, then secrets merged |
| K8s operations | `src/k8s-operations.ts` | Pod status, logs, builds, sealed secrets |
| Auth flow | `src/middleware/jwt.ts` → `src/middleware/authz.ts` | JWT → group extraction → CASL check |
| AI features | `src/ai/` | Kubernetes CRD CRUD — bypasses OtomiStack |
| Environment config | `src/validators.ts` + `.env.sample` | All env vars validated via envalid |
| Workload/chart utils | `src/utils/workloadUtils.ts` | Git URL validation, Helm chart fetching |
| Sealed secrets | `src/utils/sealedSecretUtils.ts` | Encryption, manifest creation |

## CONVENTIONS

- **No semicolons**, single quotes, trailing commas, 120 char width (Prettier)
- **OpenAPI-first**: Never add routes manually. Define in YAML spec, implement handler matching `operationId`
- **Handler signature (all versions)**: `export const opId = (req: OpenApiRequestExt, res: Response): void` — send via `res.json()`
- **Path params use curly braces in filesystem**: `src/api/v1/teams/{teamId}/services.ts` — Express resolves `:teamId`
- **Imports use `src/` prefix**: `import { ... } from 'src/middleware'` (tsconfig paths)
- **Debug logging**: `const debug = Debug('otomi:<module>')` — namespaced debug
- **Conventional commits** enforced via commitlint + Husky
- **YAML tab indentation** in test files (width 4)
- **ESLint**: camelCase functions, object shorthand, prefer template literals, no param reassign (except `memo`)
- **lint-staged**: Prettier auto-formats JS/TS/JSON/MD/YAML on commit

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** edit `src/generated-schema.ts` — auto-generated from `npm run build:models`
- **DO NOT** add routes without OpenAPI spec — express-openapi-validator rejects unspecified routes
- **DO NOT** bypass `OtomiStack` for data operations — it manages FileStore + Git + deployment sync
- **DO NOT** store secrets in main YAML files — use `secrets.*` file pattern (see ARCHITECTURE.md)
- **DO NOT** use OtomiStack for AI resources — they live as K8s CRDs, not Git YAML

## KEY PATTERNS

- **Git-as-Database**: CRUD → OtomiStack → FileStore (memory) + Git (disk) → commit → deploy
- **Secret splitting**: Main spec on disk without secrets; `secrets.*.yaml` holds sensitive fields; merged in memory via two-pass FileStore loading
- **Multi-tenant isolation**: Team resources scoped by `teamId` in paths and CASL abilities
- **WebSocket updates**: Socket.io for real-time status (builds, workloads, services, sealed secrets)
- **OpenAPI validation**: express-openapi-validator validates all requests/responses against specs
- **FileStore path mapping**: FileMap defines glob patterns + templates per AplKind (e.g., `env/teams/{teamId}/services/{name}.yaml`)

## COMMANDS

```bash
npm run dev              # Dev server with hot reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm run build:models     # Generate TS types from OpenAPI specs
npm run build:spec       # Build combined OpenAPI spec
npm test                 # Jest tests (builds models first)
npm run test:pattern -- X  # Run specific test
npm run lint             # ESLint + type check
npm run lint:fix         # Auto-fix
npm run types            # Type check only
```

## NOTES

- `otomi-stack.ts` is 2600+ lines — the monolith. All resource CRUD funnels through it.
- `generated-schema.ts` is 27k+ lines — expect slow IDE. Never read fully, grep for specific types.
- Node 24+ required (see `.nvmrc` and `package.json` engines).
- Unit tests are colocated as `*.test.ts` in `src/`. The `test/` directory contains Helm charts only.
- `.history/` directory exists (VSCode local history) — ignore it.
- Mock auth available at `GET /api/mock/{idx}` for development.
- Every API mutation commits to the values Git repo with the author's email.
- `authz.ts` uses deprecated CASL `Ability` — marked TODO for replacement.
- `src/fileStore/file-map.ts` has TODO to unify with SealedSecrets when migrated to manifests.
