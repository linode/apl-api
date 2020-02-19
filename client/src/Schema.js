
function getClustersSpec(clusters) {

  const cc = {}
  clusters.forEach(item => {

    if (!cc[item.cloudName])
      cc[item.cloudName] = []
    cc[item.cloudName].push(item.name)
  })

  let properties = {}
  Object.keys(cc).forEach(cloudName => {

    properties[cloudName] = {
      type: 'array',
      items: {
        type: 'string',
        enum: cc[cloudName]
      },
      uniqueItems: true
    }
  })

  const clustersSchema = {
    type: 'object',
    properties: properties
  }
  return clustersSchema
}

class Schema {
  constructor(openApi) {
    this.openApi = openApi
    this.schemas = this.openApi.components.schemas
  }
  getServiceSchema(clusters) {
    const clustersSchema = getClustersSpec(clusters)
    const schema = Object.assign({}, this.schemas.Service)
    schema.properties.clusters = clustersSchema

    return schema
  }
  getServiceUiSchema(schema) {
    console.log(JSON.stringify(schema))
    const clouds = Object.keys(schema.properties.clusters.properties)
    const clusters = {}
    clouds.forEach(cloudName => {
      clusters[cloudName] = { "ui:widget": "checkboxes" }
    })

    const uiSchema = {
      serviceId: { "ui:widget": "hidden" },
      teamId: { "ui:widget": "hidden" },
      serviceType: { "ui:widget": "radio" },
      clusters: clusters,
      ksvc: {
        env: { "ui:options": { orderable: false } }
      },
      annotations: { "ui:options": { orderable: false } }
    };
    return uiSchema
  }

  getTeamSchema(clusters) {
    const clustersSchema = getClustersSpec(clusters)
    const schema = Object.assign({}, this.schemas.Team)
    schema.properties.clusters = clustersSchema
    return schema
  }

  getTeamUiSchema(schema) {
    console.log(JSON.stringify(schema))
    const clouds = Object.keys(schema.properties.clusters.properties)
    const clusters = {}
    clouds.forEach(cloudName => {
      clusters[cloudName] = { "ui:widget": "checkboxes" }
    })

    const uiSchema = {
      teamId: { "ui:widget": "hidden" },
      password: { "ui:widget": "hidden" },
      clusters: clusters,
    };

    return uiSchema
  }

  convertTeamJsonSchemaToOpenApiSchema = (formData) => {
    const clusters = []
    const dd = formData.clusters
    console.log(formData)

    Object.keys(dd).forEach(cloudName => {
      if (!dd[cloudName])
        return
      dd[cloudName].forEach(clusterName => {
        clusters.push({cloudName: cloudName, name: clusterName})
      })
    })
    formData.clusters = clusters
    return formData
  }

  convertServiceJsonSchemaToOpenApiSchema = (formData) => {
    return this.convertTeamJsonSchemaToOpenApiSchema(formData)
  }
}

export default Schema
