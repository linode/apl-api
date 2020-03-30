# Overview

This application:

- provides REST API to manipulate values for teams and their services.
- connects to git repo with `otomi-stack` code in order to load/update values from/in repository.

# Git

A git repository is an persistent storage for otomi-stack values.

## git-notes

With each git commit performed by this application an extra user metadata associated. It is performed by using
[git-notes](https://git-scm.com/docs/git-notes). A user metadata is encoded in JSON format.

The metadata can be retrived by executing below command:

```
git notes show
```

# OpenApi specification

The API is defined in `openapi.yaml`. This file is used to generate validation schemas and to bind with API server
endpoints (see: `api-routes` directory).

In order to inspect the api file it is recommended to either:

- install `swagger viewer` plugin in you vscode
- or copy file content and paste in https://editor.swagger.io

A client code can access API specification by querying the following endpoint:

```
GET http://127.0.0.1:8080/v1/apiDocs
```

Moreover the `openapi.yaml` file can be used with `Postman` (File -> Import).

# Environment variables

For local development define `.env` file. Example:

```
GIT_LOCAL_PATH=/tmp/otomi-stack
# The GIT_REPO_URL - only host and path, no schema
GIT_REPO_URL=github.com/j-zimnowoda/test.git
GIT_USER=test63688
GIT_EMAIL=test63688@gmail.com
GIT_PASSWORD=wUnkus-cakzow-3nirky
```

Use `DISABLE_AUTH=1` env to disable authorization.

For production environment export the same variables with proper values.

# Docker

Building

```
docker build .
```

## Running

```
docker run --env-file='.env' -p 8080:8080/tcp <image-id>
```

## Registry

```
docker push eu.gcr.io/k8s-playground-256113/otomi/otomi-stack-api:$TAG
```

## Start app

```
npm run start
```

## Start app with live update

```
npm run start-dev
```

Note: it requires to instal globally the following package

```
npm install nodemon -g
```

## Testing

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
