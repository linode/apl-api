# Overview

This application:

- provides REST API to manipulate values for teams and their services.
- connects to git repo with `otomi-stack` code in order to load/update values from/in repository.

# Glossary:

**api spec** - a HTTP REST API definition in OpenApiV3 standard **schema** - a data model that defines attributes and
their types **attribute** - a single feature regarded as a characteristic of schema **property** - a single feature
regarded as a characteristic of api spec

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
        admin: [get-all]
        team: [get-all]
      type: array
```

From above:

- on GET /services request the permissions from `Services` schema are applied

The authorization is only applied if authentication is enabled, so required header are available.

### Resource Based Access Control (RBAC)

The RBAC is used to define allowed CRUD operation on resource. Moreover it defines if operations are performed with
regard or regardless to the resource ownership. For example:

```
components:
  schemas:
    Service:
      x-acl:
        admin: [delete-all, get-all, post-all, put-all]
        team: [delete, get, post, put]
      type: object
      properties:
```

From above configuration:

- a user with admin role can perform all CRUD operations regardless resource ownership (the `-all` postfix),
- a user with team role can perform all CRUD operations only on its own resource.

### Attribute Based Access Control (ABAC)

The ABAC permissions are used to narrow down RBAC ones. Never the other way round. For example:

```
    Service:
      x-acl:
        admin: [delete-all, get-all, post-all, put-all]
        team: [delete, get, post, put]
      type: object
      properties:
        name:
          type: string
        ingress:
          type: object
          x-acl:
            team: [get]
```

From above:

- a user with admin role can perform all CRUD operations regardless resource ownership,
- a user with team role can perform all CRUD operations only on its own resource **BUT** it cannot update ingress
  attribute.

### Limitations:

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
              x-acl: [get]       # nested x-acl not supported
        ingress:
          type: object
          x-acl:
            team: [get]
```

- ABAC is not applied for resource collections, e.g.:

```
    Services:
      x-acl:
        admin: [get-all]
        team: [get-all]
      type: array
      items:
        $ref: '#/components/schemas/Service'     # even if the components/schemas/Service defines ABAC it will NOT be applied
```

# View openapi spec

In order to inspect the api file it is recommended to either:

- install `swagger viewer` plugin in you vscode
- or copy file content and paste in https://editor.swagger.io

A client code can access API specification by querying the following endpoint:

```
GET http://127.0.0.1:8080/v1/apiDocs
```

Moreover the `openapi.yaml` file can be used with `Postman` (File -> Import).

# Configuration

## Environment variables

For local development define `.env` file. Example:

```
GIT_LOCAL_PATH=/tmp/otomi-stack
# The GIT_REPO_URL - only host and path, no schema
GIT_REPO_URL=github.com/j-zimnowoda/test.git
GIT_USER=test63688
GIT_EMAIL=test63688@gmail.com
GIT_PASSWORD=wUnkus-cakzow-3nirky
DISABLE_SYNC=0
```

Use `DISABLE_AUTH=1` env to disable authorization. Use `DISABLE_SYNC=1` to disable pushing changes to git remote branch

For production environment export the same variables with proper values.

# Git

A git repository is an persistent storage for otomi-stack values.

## git-notes

With each git commit performed by this application an extra user metadata associated. It is performed by using
[git-notes](https://git-scm.com/docs/git-notes). A user metadata is encoded in JSON format.

The metadata can be retrived by executing below command:

```
git notes show
```

# Building

## Docker images

```
docker build .
```

### Registry

```
docker push eu.gcr.io/otomi-cloud/otomi-stack-api:$TAG
```

# Running

```
docker run --env-file='.env' \
-p 8080:8080/tcp \
-v <full-path-to-dir-with-core.yaml>:/etc/otomi \
<image-id>

```

## Start app

```
npm run build
npm run start
```

## Start app with live update

```
npm run dev
```

Note: it requires to instal globally the following package

```
npm install nodemon -g
```

# Testing

Run all tests

```
npm test
```

Run all test in watch mode

```
npm test -- -g repo --watch
```

Run test by their name (regex)

```
npm test -- -g repo
```
