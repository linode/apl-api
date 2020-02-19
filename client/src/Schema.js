
function addEnumField(schema, clouds) {
  console.log(clouds)
  console.log(schema.properties.clusters.properties)

  const allClouds = ['aws', 'azure', 'google']
  allClouds.forEach(cloudName => {
    if(!clouds[cloudName]) {
      delete schema.properties.clusters.properties[cloudName]
      return
    }
    schema.properties.clusters.properties[cloudName].items.enum = []
  })

  Object.keys(clouds).forEach(cloudName => {
    schema.properties.clusters.properties[cloudName].items.enum = clouds[cloudName]
  })
  console.log(schema)

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
    return schema
  }

  getTeamUiSchema(schema) {

    const uiSchema = {
      teamId: { "ui:widget": "hidden" },
      password: { "ui:widget": "hidden" },
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
