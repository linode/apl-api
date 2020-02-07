const openApiData = {
  "openapi": "3.0.0",
  "security": [
    {
      "groupAuthz": []
    }
  ],
  "info": {
    "title": "The otomi-stack API",
    "version": "0.1.0"
  },
  "paths": {
    "/readiness": {
      "get": {
        "security": [],
        "description": "Check readiness",
        "responses": {
          "200": {
            "description": "Service is ready"
          }
        }
      },
      "parameters": []
    },
    "/teams": {
      "get": {
        "description": "Get teams collection",
        "responses": {
          "200": {
            "description": "Successfully obtained teams collection",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Teams"
                }
              }
            }
          }
        }
      },
      "post": {
        "description": "Create a team",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Team"
              }
            }
          },
          "description": "Team object that needs to be added to the collection",
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successfully obtained teams collection",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Team"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "409": {
            "description": "Team already exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "parameters": []
    },
    "/teams/{teamId}": {
      "get": {
        "description": "Get a specific team",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team to return",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully obtained team",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Team"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "404": {
            "description": "Team does not exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "put": {
        "description": "Edit a team",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team to return",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Team"
              }
            }
          },
          "description": "Team object that contains updated values",
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successfully edited team",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Team"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "404": {
            "description": "Team does not exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "description": "Delete team",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team to delete",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully deleted a team"
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "404": {
            "description": "Team does not exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "parameters": []
    },
    "/teams/{teamId}/services": {
      "get": {
        "description": "Get services from a given team",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully obtained services",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Services"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          }
        }
      },
      "post": {
        "description": "Create a service",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Service"
              }
            }
          },
          "description": "Service object",
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successfully stored service configuration",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Service"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "409": {
            "description": "Team already exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "parameters": []
    },
    "/teams/{teamId}/services/{serviceId}": {
      "get": {
        "description": "Get a service from a given team",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team to return",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "in": "path",
            "description": "ID of the service",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully obtained service configuration",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Service"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "404": {
            "description": "Service does not exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "put": {
        "description": "Edit a service from a given team",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team to return",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "in": "path",
            "description": "ID of the service",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Service"
              }
            }
          },
          "description": "Service object that contains updated values",
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successfully edited service",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Team"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "404": {
            "description": "Service does not exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "description": "Delete a service from a given team",
        "parameters": [
          {
            "name": "teamId",
            "in": "path",
            "description": "ID of team to delete",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "in": "path",
            "description": "ID of the service",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully deleted a service"
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OpenApiValidationError"
                }
              }
            }
          },
          "404": {
            "description": "Service does not exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "parameters": []
    },
    "/deployments": {
      "post": {
        "description": "Trigger a deployment (only for admin)",
        "responses": {
          "202": {
            "description": "Deployment has been triggered",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Deployment"
                }
              }
            }
          },
          "409": {
            "description": "Unable not push data to git repo",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OtomiStackError"
                }
              }
            }
          }
        }
      },
      "parameters": []
    },
    "/apiDocs": {
      "get": {
        "security": [],
        "description": "Get OpenApi document",
        "responses": {
          "200": {
            "description": "The requested apiDoc.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "default": {
            "description": "The requested apiDoc."
          }
        }
      },
      "parameters": []
    }
  },
  "servers": [
    {
      "url": "http://127.0.0.1:8080/v1"
    }
  ],
  "components": {
    "securitySchemes": {
      "groupAuthz": {
        "type": "apiKey",
        "name": "Auth-Group",
        "in": "header"
      }
    },
    "schemas": {
      "Deployment": {
        "properties": {
          "id": {
            "type": "integer"
          },
          "status": {
            "type": "string",
            "readOnly": true,
            "description": "Deployment status",
            "enum": [
              "in-progress",
              "completed",
              "failed"
            ]
          }
        }
      },
      "Team": {
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
            "example": "team-1"
          },
          "password": {
            "type": "string",
            "example": "strongpasswprd"
          },
          "teamId": {
            "type": "string",
            "readOnly": true
          }
        },
        "required": [
          "name",
          "password"
        ]
      },
      "TeamOidc": {
        "properties": {
          "clientID": {
            "type": "string",
            "example": "ad8611c4-a701-4ec8-8ad3-a510441e728f"
          },
          "clientSecret": {
            "type": "string",
            "example": "Qn/=aZ7x]b/8PgGJhbtAlAejq0fA0P1K"
          }
        },
        "required": [
          "clientID",
          "clientSecret"
        ]
      },
      "Teams": {
        "properties": {
          "teams": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Team"
            }
          }
        }
      },
      "Services": {
        "properties": {
          "services": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Service"
            }
          }
        }
      },
      "Service": {
        "properties": {
          "name": {
            "type": "string",
            "description": "Service name visible as subdomain",
            "pattern": "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
            "example": "service-01"
          },
          "domain": {
            "type": "string",
            "description": "A custom domain",
            "pattern": "^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$",
            "example": "redkubes.com"
          },
          "svc": {
            "type": "string",
            "readOnly": true
          },
          "image": {
            "type": "object",
            "properties": {
              "registry": {
                "type": "string",
                "pattern": "^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$",
                "example": "docker.io",
                "default": "docker.io"
              },
              "repository": {
                "type": "string",
                "pattern": "^[a-z0-9]+(?:[/._-]{1,2}[a-z0-9]+)*$",
                "example": "service.01"
              },
              "tag": {
                "type": "string",
                "example": "1.0.0"
              }
            }
          },
          "teamId": {
            "type": "string",
            "readOnly": true
          },
          "serviceId": {
            "type": "string",
            "readOnly": true
          },
          "hasCert": {
            "type": "boolean",
            "default": true,
            "description": "If true certificate is generated automatically. Otherwise it is expected that administrator provides cert as a secret 'cert-team-$teamName-$serviceName' for a given team."
          },
          "certArn": {
            "type": "string",
            "readOnly": true,
            "description": "Only if hasCert set to true and deployed on AWS",
            "example": "arn:aws:acm:eu-central-1:xxx:certificate/xxx"
          }
        },
        "required": [
          "name",
          "image"
        ]
      },
      "OpenApiValidationError": {
        "properties": {
          "status": {
            "type": "integer"
          },
          "errors": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ValidationError"
            }
          }
        }
      },
      "ValidationError": {
        "properties": {
          "path": {
            "type": "string"
          },
          "errorCode": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "location": {
            "type": "string",
            "enum": [
              "body",
              "path"
            ]
          }
        }
      },
      "OtomiStackError": {
        "properties": {
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}


class Schema {
  constructor(openApi) {
    this.openApi = openApi
    this.schemas = this.openApi.components.schemas
  }
  getServiceSchema() {
    return this.schemas.Service
  }
  getTeamSchema() {
    return this.schemas.Team
  }
}


export { openApiData }
export default Schema
