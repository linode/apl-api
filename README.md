# Otomi Api

This application provides a HTTP REST API (definition in [OpenApiV3](https://swagger.io/specification/) standard) to manipulate values for teams and their services.
Git is used as the persistent storage for the values that will be consumed by [otomi-stack](https://github.com/redkubes/otomi-stack) for reconciling the state of the cluster landscape. (For an example look at the [otomi-values](https://github.com/redkubes/otomi-values-demo) repo with demo values.)
Every api deployment will result in a commit to the values repo with the author's email in the title.

## Design documents

- [REST API and GitOps](docs/gitops.md)

## 1. Development

### 1.1 Prerequisites

- npm@~10.0 installed
- a valid values repo: follow these [instructions in otomi-core](https://github.com/redkubes/otomi-core/blob/main/docs/setup.md#a-valid-values-repo)

### 1.2 Setting up environment

The following two steps only need to be performed once:

1. Copy `.env.sample` to `.env` and edit accordingly.
2. Download `otomi-api/.secrets` file from [Google Drive secrets](https://drive.google.com/drive/folders/1N802vs0IplKehkZq8SxMi67RipyO1pHN) and put content in `.env`.

The last step is running `npm install`.

### 1.3 Running dependencies

The api depends on a running `otomi-core` tools server. It can be started from the `otomi-core` repo with:

```bash
export ENV_DIR={location of your values repo}
otomi server
```

Another way to start it in docker-compose (from within this repo):

```
bin/dc.sh up-deps &
```

(This setup and fragile and might be broken. If that is the case just clone `otomi-core` and follow the first suggestion.)

### 1.4 Run the dev server

From the root of this project:

```bash
export ENV_DIR={location of your values repo}
export GIT_LOCAL_PATH=$ENV_DIR
npm run dev
```

### 1.5 Mock different users

In order to test websocket communication between two browsers you can prime the api to register two different users.
To set the api to register user 0 or 1:

```
http://localhost:3000/api/mock/0
http://localhost:3000/api/mock/1
```

See `src/mocks.ts` for details.

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

### 2.2 Authentication

The authentication ensures that a user is identified, so the request contains required headers.

The authentication security schemas are defined under `components.securitySchemes` in `src/api.yaml` file. In the same
file a global authentication schema is defined under the `security` property and is applied to all API HTTP methods
unless it is explicitly defined at a given HTTP method.

For example:

```
paths:
  /secrets:
    get:
      responses:
        '200':
```

From above:

- the GET /secrets request handler authenticate it by using security schema defined under global `security` property.

How to set headers for OWASP:

```
X-Frame-Options: sameorigin
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
X-Content-Type-Options: same-origin
```

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
        platformAdmin: [read]
        teamAdmin: [read]
        teamMember: [read]
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
        platformAdmin: [delete-any, read-any, create-any, update-any]
        teamAdmin: [delete, read, create, update]
        teamMember: [delete, read, create, update]
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

By default all resource attributes can be modified by any user that is allowed to access the resource (RBAC)
ABAC aims to restrict control of changing specific attributes that belong to a given resource.

All possible ABAC configurations are defined in the `TeamSelfService` schema. This schema can be used to define a team's `selfService` configuration. Only one with `admin` role can modify that property.

The `TeamSelfService` schema is composed by:

- property that corresponds to a schema name from `api.yaml` file.
- `enum` property that indicates JSON paths for attributes that shall be controlled.

**Note:**

- `delete` permission cannot be set for ABAC

For example:

```
    Service:
      x-acl:
        platformAdmin: [delete-any, read-any, create-any, update-any]
        teamAdmin: [delete, read, create, update]
        teamMember: [delete, read, create, update]
      type: object
      properties:
        name:
          type: string
        ingress:
          type: object
          x-acl:
            platformAdmin: [read, create]
            teamAdmin: [read]
            teamMember: [read]
```

From above:

A user with admin role can:

- perform all CRUD operations regardless resource ownership (RBAC)
- all attributes can be edited except ingress that can be only set on resource creation event (ABAC)

A user with team role can:

- perform all CRUD operations only withing its own team (RBAC)
- all attributes can be edited except ingress that isn be only read (ABAC)

#### 2.3.3 Limitations

##### 2.3.3.1 OpenAPI-generator limitations

<!-- Add more issues if you spot them and know the limitations/work-arounds -->

Known issues:

- https://github.com/redkubes/otomi-api/issues/155

###### Problem

It doesn't matter if you've entered a valid OpenAPI specification, it isn't useful as long as it isn't generated as a client library.

###### Cause

There are too many variations of this problem to be listed here and still make sense, but they follow the following cycle in general:

1. `src/openapi/\*.yaml` cannot be dereferenced/bundled by parsing JSON `$refs`.
2. Dereferenced/bundled OpenAPI spec cannot be generated
3. Client libary in `vendors/client/otomi-api/axios/...` cannot be compiled with `tsc`
4. Code cannot be committed in version control (Git)
5. Consume API methods and/or models

###### Solutions

In this paragraph the causes are addressed by the corresponding number under "Cause":

1. In the `npm run ...` scripts, `vendors/openapi/otomi-api.json` may be deleted to see if the spec can be successfully dereferenced/bundled and used as input for `openapi-generator`.
2. The `openapi-generator` can throw useful/meaningful errors. But there are errors under known issues (see above) that need a work-around.
3. These errors happen the most arbitrarily. See if you can go back in your small increments in `src/openapi/...` until you can successfully build the client library again.
4. These errors are often due to our own code. E.g.: a generated model is used, and by changing the OpenAPI spec you change the schema. Models used to rely on the schema and now they are missing.
5. If you change the name of a schema, add a title, etc., the respective reference might change. Then the consumption in the API library might break.

###### Note

- Also check if you can successfully generate the client library again after committing, just as a pre-caution.
- To determine a successful generation of the client library, please check out the generated models in `vendors/client/otomi-api/axios/models` if they make sense or not.
- As general advice, make sure to increment the specification VERY slowly and always see if a spec can be generated or not.

## 3. Viewing/consuming openapi spec

In order to inspect the api file it is recommended to either:

- install `swagger viewer` plugin in you vscode
- or copy file content and paste in <https://editor.swagger.io>

Client code can get the API doc by querying the following endpoint:

```
GET http://127.0.0.1:8080/v1/apiDocs
```

Moreover the `openapi.yaml` file can be used with `Postman` (File -> Import).

## 4. Models generated from spec

When any of the `src/openapi/*.yaml` files change, new models will be generated into `src/generated-schema.ts`. These models are exported as types in `src/otomi-models.ts` and used throughout the code.

**IMPORTANT:**

Because openapi bundler optimizes by re-using schema blocks but does not take into account depth of the schema, it creates a schema that is not usable by the `npm run build:client` task. This only happens when a subschema references root schemas, and only for certain props. We had to apply some yaml anchor hacking to make it work.

When you encounter errors during client generation, instead of referencing the faulty props by `$ref` use a yaml anchor.Example file: `src/openapi/team.yaml`.
