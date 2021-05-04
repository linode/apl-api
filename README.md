# Otomi Stack Api

This application provides a HTTP REST API (definition in [OpenApiV3](https://swagger.io/specification/) standard) to manipulate values for teams and their services.
Git is used as the persistent storage for the values that will be consumed by [otomi-stack](https://github.com/redkubes/otomi-stack) for reconciling the state of the cluster landscape. (For an example look at the [otomi-values](https://github.com/redkubes/otomi-values-demo) repo with demo values.)
Every api deployment will result in a commit to the values repo with the author's email in the title.

## 1. Development

### 1.1 Prerequisites

- npm@~10.0 installed

### 1.2 Setting up environment

1. Copy `.env.sample` to `.env` and edit accordingly.
2. Download `otomi-api/.secrets` file from [Google Drive secrets](https://drive.google.com/drive/folders/1N802vs0IplKehkZq8SxMi67RipyO1pHN) and put content in `.env`.
3. Setup access to GitHub Packages in this directory and repository:

```
source .env && echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> ~/.npmrc
```

The @redkubes Github packages repository is a proxy for all NPM packages. Currently in use for these repositories:

- otomi-api
- otomi-tasks

4. `npm install`

### 1.3 Running services in docker-compose

```
bin/dc.sh up-deps &
```

### 1.4 Run dev server

```
npm run dev
```

### 1.5 Running tests

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

### 1.6 Linking client to be used by console

In order to work with the dev version of the generated client:

```bash
npm run build:client
cd vendors/client/otomi-api/axios/
npm link
```

And the go to the otomi-console folder and link with `npm link @redkubes/otomi-api-client-axios`

## 2. Api design

### 2.1 Specification

The API is defined in [src/openapi/api.yaml](src/openapi/api.yaml) file in OpenApi v3 format.

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
relevant usage in otomi-web repo)

### 1.2 Authentication

The authentication ensures that a user is identified, so the request contains required headers.

The authentication security schemas are defined under `components.securitySchemes` in `src/api.yaml` file. In the same
file a global authentication schema is defined under the `security` property and is applied to all API HTTP methods
unless it is explicitly defined at a given HTTP method.

For example:

```
paths:
  /clusters:
    get:
      responses:
        '200':
```

From above:

- the GET /clusters request handler authenticate it by using security schema defined under global `security` property.

### 2.3 Authorization

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

#### 2.3.1 Resource Based Access Control (RBAC)

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

#### 2.3.2 Attribute Based Access Control (ABAC)

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

#### 2.3.3 Limitations

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

## 2. Viewing/consuming openapi spec

In order to inspect the api file it is recommended to either:

- install `swagger viewer` plugin in you vscode
- or copy file content and paste in <https://editor.swagger.io>

Client code can get the API doc by querying the following endpoint:

```
GET http://127.0.0.1:8080/v1/apiDocs
```

Moreover the `openapi.yaml` file can be used with `Postman` (File -> Import).

## 3. Models generated from spec

When any of the `src/openapi/*.yaml` files change, new models will be generated into `src/generated-schema.ts`. These models are exported as types in `src/otomi-models.ts` and used throughout the code.

**IMPORTANT:**

Because openapi bundler optimizes by re-using schema blocks but does not take into account depth of the schema, it creates a schema that is not usable by the `npm run build:client` task. This only happens when a subschema references root schemas, and only for certain props. We had to apply some yaml anchor hacking to make it work.

When you encounter errors during client generation, instead of referencing the faulty props by `$ref` use a yaml anchor. Example file: `src/openapi/team.yaml`.
