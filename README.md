# Akamai App Platform API

**The brain of Akamai App Platform** - A REST API service that manages Kubernetes teams, workloads, and services using Git as persistent storage.

### Prerequisites

- **Node.js**: v22.x (see `.nvmrc`)
- **npm**: v10.x+
- **Git**: For version control and values repository
- **Running Akamai App Platform Core Server** [Akamai App Platform Core](https://github.com/linode/apl-core)

### 1. Setup Environment

```bash
# Clone the repository
git clone https://github.com/linode/apl-api.git
cd apl-api
# Install dependencies
npm install
# Setup environment variables
cp .env.sample .env
# Edit .env with your configuration
npm run dev
```

The API will be available at `http://localhost:8080`

## Essential Commands

### Development

```bash
npm run dev          # Start development server with hot reload
npm run build        # Full production build
npm run start        # Start production server
npm test             # Run all tests
```

### Code Quality

```bash
npm run lint         # Check code style and types
npm run lint:fix     # Auto-fix linting issues
npm run types        # Type check only
```

### OpenAPI & Models

```bash
npm run build:models # Generate TypeScript models from OpenAPI
npm run build:spec   # Build OpenAPI specification
```

## Architecture

### Core Concept

- **Git-as-Database**: All configuration stored as YAML in Git repository
- **OpenAPI-First**: All endpoints auto-generated from `src/openapi/*.yaml` specs
- **Multi-Tenant**: Team isolation with RBAC authorization
- **Real-time**: WebSocket updates for live status monitoring

### Key Components

| Component            | Purpose                             |
| -------------------- | ----------------------------------- |
| `src/app.ts`         | Express server setup and middleware |
| `src/otomi-stack.ts` | Core business logic engine          |
| `src/authz.ts`       | Authorization system (CASL-based)   |
| `src/api/`           | Auto-generated route handlers       |
| `src/openapi/`       | OpenAPI specifications              |
| `src/middleware/`    | JWT, session, authz middleware      |

## Authentication & Authorization

### Authentication

- **JWT tokens** with user identity and teams
- **Headers required**: `Authorization`, `Auth-Group`
- **Mock users** available for testing

### Authorization (RBAC)

- **platformAdmin**: Full system access
- **teamAdmin**: Manage own team resources
- **teamMember**: Limited team resource access

### Testing Auth

Mock different users:

```
GET http://localhost:8080/api/mock/0  # Mock user 0
GET http://localhost:8080/api/mock/1  # Mock user 1
```

## Development Guide

### Adding New Endpoints

1. **Define in OpenAPI** (`src/openapi/*.yaml`):

```yaml
paths:
  '/teams/{teamId}/services':
    get:
      operationId: getTeamServices
      parameters:
        - name: teamId
          in: path
          required: true
```

2. **Implement Handler** (`src/api/v1/teams/{teamId}/services.ts`):

```typescript
export async function getTeamServices(req: OpenApiRequestExt): Promise<AplResponseObject> {
  // Implementation here
}
```

3. **Add Authorization** (in OpenAPI spec):

```yaml
x-aclSchema: Service
components:
  schemas:
    Service:
      x-acl:
        platformAdmin: [read-any, create-any, update-any, delete-any]
        teamAdmin: [read, create, update, delete]
        teamMember: [read]
```

4. **Generate Schema**

```
npm run build:models
```

5. **(Optional) Regenerate Schema in Console**

```
// in the console termininal:
npm run gen:store
```

### Working with Git Storage

All data operations go through `OtomiStack` class:

```typescript
const stack = new OtomiStack()
await stack.getTeamConfigService('team-id')
await stack.createService('team-id', serviceData)
```

Every api deployment will result in a commit to the values repo with the author's email in the title.

### Testing

```bash
npm test                           # All tests
npm run test:pattern -- MyTest     # Specific test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

Licensed under Apache License, Version 2.0. See [LICENSE.md](LICENSE.md).
