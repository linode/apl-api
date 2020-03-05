
function addEnumField(schema, clouds) {

  const allClouds = ['aws', 'azure', 'google']
  const clusters = schema.properties.clusters
  allClouds.forEach(cloudName => {
    // console.log(clusters.properties[cloudName])
    if(!clusters.properties[cloudName]) {
      delete clusters.properties[cloudName]
      return
    }
    clusters.properties[cloudName].items.enum = []
  })

  Object.keys(clouds).forEach(cloudName => {
    clusters.properties[cloudName].items.enum = clouds[cloudName]
  })
}

class Schema {
  constructor(openApi) {
    this.openApi = openApi
    this.schemas = this.openApi.components.schemas
  }
  getServiceSchema(clouds) {
    
    const schema = Object.assign({}, this.schemas.Service)
    addEnumField(schema, clouds)

    return schema
  }

  getTeamSchema(clouds) {
    const schema = Object.assign({}, this.schemas.Team)
    addEnumField(schema, clouds)
    console.log(schema)
    return schema
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
        aws: { "ui:widget": "checkboxes" },
        azure: { "ui:widget": "checkboxes" },
        google: { "ui:widget": "checkboxes" },
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
        aws: { "ui:widget": "checkboxes" },
        azure: { "ui:widget": "checkboxes" },
        google: { "ui:widget": "checkboxes" },
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
