#  Overview

The otomi-stack-api is REST API implementation for otomi-stack.
The API allows to manipulate teams and their configurations.


# Running
## Environment variables
For local development define `.env` file. Example:
```
PORT=8080
OTOMI_STACK_PATH=~/workspace/otomi/otomi-stack-values
KUBE_PATH=~/.kube
```
For production environment export the same variables.

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

# Access OpenApi defition
```
http://127.0.0.1:8080/v1/apiDocs
```

# Testing
For manual test you can load `openapi.yaml` file into postman and perform queries.