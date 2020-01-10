#  Overview

The otomi-stack-api is REST API implementation for otomi-stack.
The API allows to manipulate teams and their configurations.

  
# OpenApi specification
The API is defined in `openapi.yaml`. This file is used to generate validation schemas and bind with API server endpoints (see: `api-routes` directory).



In order to inspect the api file it is recommended to either:
- install `swagger viewer` plugin in you vscode
- or copy file content and paste in https://editor.swagger.io



A client code can access API specification by querying the following endpoint:
```
GET http://127.0.0.1:8080/v1/apiDocs
```

Moreover the `openapi.yaml` file can be used with `Postman` (File -> Import).

# Running
## Prerequisite
The `otomi-stack-api` can access
- the otomi-stack repository content under a path specified in OTOMI_STACK_PATH env
- the .kube directory with proper credentials under a path specified in KUBE_PATH
- helmfile and helm, kubectl installed binaries

## Environment variables
For local development define `.env` file. Example:
```
PORT=8080
OTOMI_STACK_PATH=/otomi-stack
KUBE_CONTEXT=minikube
DEPLOYMENT_STAGE=dev
```
For production environment export the same variables with proper values.

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
