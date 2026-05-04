# Utilities

## OVERVIEW

Domain-specific utility modules. No barrel file — import each directly.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Workload/Helm operations | `workloadUtils.ts` | Git URL validation, chart fetching, sparse clone, provider detection |
| Code repository setup | `codeRepoUtils.ts` | Gitea URL management, SSH key normalization, connectivity testing |
| Sealed secret encryption | `sealedSecretUtils.ts` | Encrypt values, create manifests, extract secret paths |
| User/Keycloak integration | `userUtils.ts` | User data handling, username validation |
| YAML safety | `yamlUtils.ts` | `quoteIfDangerous`, `deepQuote` — prevents YAML injection |
| V1↔APL object conversion | `manifests.ts` | Bidirectional transforms, merge utilities |
| Policy retrieval | `policiesUtils.ts` | Reads policies from generated schema |
| K8s version checks | `k8sUtils.ts` | Cluster version, Knative support detection |
| Object storage/cluster ID | `wizardUtils.ts` | `ObjectStorageClient` class, cluster ID definition |

## CONVENTIONS

- **No barrel export** — import individual files: `import { ... } from 'src/utils/workloadUtils'`
- **Debug namespace**: `otomi:utils:*`
- **Tests colocated**: `*.test.ts` alongside source files

## ANTI-PATTERNS

- **DO NOT** add generic helpers here — each file is domain-scoped
- **DO NOT** import from `src/utils` (no index.ts) — always import specific file
