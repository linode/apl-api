const yaml = require('js-yaml');

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

export default Schema
