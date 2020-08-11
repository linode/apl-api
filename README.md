# Overview

This application:

- provides REST API to manipulate values for teams and their services.
- connects to git repo with `otomi-stack` code in order to load/update values from/in repository.

# Setting up environment

1. Download .secrets file from Google Drive (https://drive.google.com/drive/folders/0AGwuKvXYSqGIUk9PVA) to root directory of this project.

2. Setup access to GitHub packages

```
. ./.secrets && echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> ~/.npmrc
```

# Docker

## Building

```
TAG=dev
. ./.secrets
# The .secrets contains NPM_TOKEN env
docker build -t eu.gcr.io/otomi-cloud/otomi-stack-api:$TAG --build-arg=NPM_TOKEN .
```

# Local development

All in docker compose:

```
bin/dc.sh up-all
```

With only dependencies running in docker compose:

```
bin/dc.sh up-deps
npm run dev
```

# Testing

Run all tests

```
npm test
```

Run test by name (regex)

```
npm test -- -g repo
```

Run test by name (regex) in watch mode

```
npm test -- -g repo --watch
```

# Glossary

**api spec** - a HTTP REST API definition in OpenApiV3 standard **schema** - a data model that defines attributes and
their types **attribute** - a single feature of schema **property** - a single feature of schema **resource** - an
instance of schema

# Api

## Specification

The API is defined in `src/api.yaml` file in OpenApi v3 format.

This file is used to generate server API endpoints and client API library as well. The api endpoints are bound to a
given function that developer can implement. For example:

```
paths:
  '/teams/{teamId}':
    operationId: getTeam
    get:
      parameters:
        - name: teamId
          in: path
          required: true
          schema:
            type: string
```

For the api server it is expected that the `src/api/teams/{teamId}.ts` file exists and implements api endpoints for get
method.

For the api client there is an `operationId` property defined. It can be used to client with expected method names (see
relevant usage in otomi-stack-web repo)

## Authentication

The authentication ensures that a user is identified, so the request contains required headers.

The authentication security schemas are defined under `components.securitySchemes` in `src/api.yaml` file. In the same
file a global authentication schema is defined under the `security` property and is applied to all API HTTP methods
unless it is explicitly defined at a given HTTP method.

For example:

```
paths:
  /readiness:
    get:
      security: []
      responses:
        '200':
  /clusters:
    get:
      responses:
        '200':
```

From above:

- the GET /readiness request handler skips authentication because security schema is overwritten with empty one:
  `paths./readiness.get.security: []`,
- the GET /clusters request handler authenticate it by using security schema defined under global `security` property.

## Authorization

An authorization is defined in `src/api.yaml` file as an extension to OpenApiV3 spec.

There are two keywords used to specify authorization:

- **x-aclSchema** - indicates a schema that contains `x-acl` properties applicable for a given API request,
- **x-acl** - defines roles and allowed CRUD operations for each role.

For example:

```
paths:
  /services:
    get:
      x-aclSchema: Services

components:
  schemas:
    Services:
      x-acl:
        admin: [read]
        team: [read]
      type: array
```

From above:

- on GET /services request the permissions from `Services` schema are applied

The authorization is only applied if authentication is enabled, so required header are available.

### Resource Based Access Control (RBAC)

The RBAC is used to define allowed CRUD operations on resource level. It also guards resource ownership by comparing
`teamId` from HTTP request parameter against content of `Auth-Group` HTTP header.

The following example briefly introduce possible configurations:

```
components:
  schemas:
    Service:
      x-acl:
        admin: [delete-any, read-any, create-any, update-any]
        team: [delete, read, create, update]
      type: object
      properties:
```

From above:

- a user with admin role can perform all CRUD operations regardless resource ownership (the `-any` postfix),
- a user with team role can perform all CRUD operations only on its own resource.

**Note:**

- use `-any` if a given role grands permission to perform operations regardless resource ownership
- the `-any` is supported only for RBAC permissions

### Attribute Based Access Control (ABAC)

The ABAC permissions are used to limit RBAC permissions (never the other way round)

The following permissions can be set for a given resource attribute:

- `create` - a user can set attribute while creating a new resource
- `read` - a user can obtain this field
- `update` - a user can set attribute while updating an existing resource

**Note:**

- `delete` permission cannot be set for ABAC

For example:

```
    Service:
      x-acl:
        admin: [delete-any, read-any, create-any, update-any]
        team: [delete, read, create, update]
      type: object
      properties:
        name:
          type: string
        ingress:
          type: object
          x-acl:
            admin: [read, create]
            team: [read]
```

From above:

A user with admin role can:

- perform all CRUD operations regardless resource ownership (RBAC)
- all attributes can be edited except ingress that can be only set on resource creation event (ABAC)

A user with team role can:

- perform all CRUD operations only withing its own team (RBAC)
- all attributes can be edited except ingress that isn be only read (ABAC)

### Limitations

- nested ABAC is NOT supported E.g.:

```
    Service:
      type: object
      properties:
        name:
          type: object
          properties:
            name:
              type: string
              x-acl: [read]       # nested x-acl not supported
        ingress:
          type: object
          x-acl:
            team: [read]
```

- ABAC is not applied for resource collections, e.g.:

```
    Services:
      x-acl:
        admin: [read-any]
        team: [read-any]
      type: array
      items:
        $ref: '#/components/schemas/Service'     # even if the components/schemas/Service defines ABAC it will NOT be applied
```

# View openapi spec

In order to inspect the api file it is recommended to either:

- install `swagger viewer` plugin in you vscode
- or copy file content and paste in <https://editor.swagger.io>

A client code can access API specification by querying the following endpoint:

```
GET http://127.0.0.1:8080/v1/apiDocs
```

Moreover the `openapi.yaml` file can be used with `Postman` (File -> Import).

# Configuration

## Environment variables

For local development copy `.env.sample` to `.env.dev` and copy `otomi-stack/.secrets` from company secrets storage.

Use `DISABLE_AUTH=1` env to disable authorization. Use `DISABLE_SYNC=1` to disable pushing changes to git remote branch

For production environment export the same variables with proper values.

# Git

Git is used as the persistent storage for otomi-stack values.

## git-notes

With each git commit performed by this application an extra user metadata associated. It is performed by using
[git-notes](https://git-scm.com/docs/git-notes). A user metadata is encoded in JSON format.

The metadata can be retrived by executing below command:

```
git notes show
```
