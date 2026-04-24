# AI Module

## OVERVIEW

Kubernetes CRD CRUD handlers for AI resources (models, agents, knowledge bases, databases). Bypasses OtomiStack — talks directly to K8s API.

## STRUCTURE

```
ai/
├── k8s.ts                    # Shared K8s client (CustomObjectsApi, AppsV1Api)
├── aiModelHandler.ts         # AI model CRD operations
├── AkamaiAgentCR.ts          # Agent custom resource CRUD
├── AkamaiKnowledgeBaseCR.ts  # Knowledge base custom resource CRUD
├── DatabaseCR.ts             # Database custom resource CRUD
└── *.test.ts                 # Colocated tests for each handler
```

## CONVENTIONS

- **Direct K8s API**: Uses `@kubernetes/client-node` CustomObjectsApi — does NOT go through OtomiStack/FileStore
- **CRD pattern**: Each `*CR.ts` file exports create/get/list/update/delete for one custom resource
- **Shared client**: `k8s.ts` provides lazy-initialized, resettable API clients
- **Debug namespace**: `otomi:ai:*`
- **API version**: Alpha (`src/api/alpha/ai/`)

## ANTI-PATTERNS

- **DO NOT** use OtomiStack for AI resources — they live as K8s CRDs, not Git YAML
- **DO NOT** forget `resetApiClients()` in tests — clients are module-level singletons
