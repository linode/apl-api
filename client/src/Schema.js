
function addEnumField(schema, clusters) {
  console.log(clusters)
  schema.properties.clusters.items.enum = clusters
}

class Schema {
  constructor(openApi) {
    this.openApi = openApi
    this.schemas = this.openApi.components.schemas
  }

  getServiceSchema(clusters) {
    
    const schema = Object.assign({}, this.schemas.Service)
    addEnumField(schema, clusters)
    return schema
  }

  getTeamSchema(clusters) {
    const schema = Object.assign({}, this.schemas.Team)
    addEnumField(schema, clusters)
    // console.log(schema)
    return schema
  }

  getIngressSchema() {
    const schema = Object.assign({}, this.schemas.Ingress)
    // console.log(schema)
    return schema
  }
  getIngressUiSchema() {
    const uiSchema = {
      ingressId: { "ui:widget": "hidden" },
    };
    return uiSchema  
  }

  getTeamUiSchema() {
    console.log('getTeamUiSchema')

    const uiSchema = {
      teamId: { "ui:widget": "hidden" },
      password: { "ui:widget": "hidden" },
      oidc: {
        clientSecret: {"ui:widget": "password"}
      },
      clusters: {
        "ui:widget": "checkboxes",
      },
    };

    return uiSchema
  }

  getServiceUiSchema(schema) {
    console.log(JSON.stringify(schema))

    const uiSchema = {
      serviceId: { "ui:widget": "hidden" },
      teamId: { "ui:widget": "hidden" },
      serviceType: { "ui:widget": "radio" },
      clusters: {
       "ui:widget": "checkboxes",
      },      
      ksvc: {
        env: { "ui:options": { orderable: false } }
      },
      annotations: { "ui:options": { orderable: false } }
    };
    return uiSchema
  }
}

export default Schema
