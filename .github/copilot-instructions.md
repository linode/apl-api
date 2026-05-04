# APL Core - AI Coding Agent Instructions

## Project Overview

APL Core (App Platform for Linode) is a Kubernetes platform that integrates 30+ cloud-native applications (Istio, Argo CD, Keycloak, Tekton, Harbor, etc.) into a cohesive, multi-tenant PaaS. The codebase is a hybrid of TypeScript (CLI/operators), Helm charts, Helmfile manifests, and Go templates.

## Knowledge Base

Use AGENTS.md files as your primary reference for understanding the codebase structure, conventions, and critical patterns. Each AGENTS.md file provides a comprehensive overview of its respective directory.

| File                                                   | Focus                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                               | Root: architecture, conventions, commands                  |
| [`src/api/AGENTS.md`](src/api/AGENTS.md)               | Versioned route handlers (v1/v2/alpha), handler signatures |
| [`src/middleware/AGENTS.md`](src/middleware/AGENTS.md) | Auth chain: JWT → groups → CASL → session → errors         |
| [`src/openapi/AGENTS.md`](src/openapi/AGENTS.md)       | OpenAPI YAML specs, ACL definitions, schema conventions    |
| [`src/ai/AGENTS.md`](src/ai/AGENTS.md)                 | AI CRD handlers (models, agents, knowledge bases)          |
| [`src/utils/AGENTS.md`](src/utils/AGENTS.md)           | Domain utilities: workloads, secrets, repos, YAML          |
