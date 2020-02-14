class OtomiStack {
  constructor(repo, db) {
    this.db = db
    this.repo = repo
    this.valuesPath = './values/_env/teams.yaml'
  }

  async init() {
    try {
      await this.repo.clone()
      this.loadValues()
    } catch (e) {
      console.error(e.message)
      return false
    }
    return true
  }

  getTeams() {
    const res_data = this.db.getCollection('teams')
    return res_data
  }

  getTeam(req_params) {
    const res_data = this.db.getItem('teams', req_params)
    return res_data
  }

  checkIfTeamExists(req_params) {
    this.db.getItem('teams', { teamId: req_params.teamId })
  }

  createTeam(req_params, data) {
    // The team name is its ID
    req_params.teamId = data.name
    const res_data = this.db.createItem('teams', req_params, data)
    return res_data
  }

  editTeam(req_params, data) {
    const res_data = this.db.updateItem('teams', req_params, data)
    return res_data
  }

  deleteTeam(req_params) {
    let res_data = this.db.deleteItem('services', req_params)
    res_data = this.db.deleteItem('teams', req_params)

    return res_data
  }

  getServices(req_params) {
    // console.log(req_params)
    this.checkIfTeamExists(req_params)
    const res_data = this.db.getCollection('services', req_params)
    return res_data
  }

  createService(req_params, data) {
    this.checkIfTeamExists(req_params)
    // The service name is its ID
    req_params.serviceId = data.name
    const res_data = this.db.createItem('services', req_params, data)
    return res_data
  }

  createDefaultService(data) {
    const res_data = this.db.createItem('defaultServices', {}, data)
    return res_data
  }

  getDefaultServices() {
    return this.db.getCollection('defaultServices')
  }


  getService(req_params) {
    this.checkIfTeamExists(req_params)
    const res_data = this.db.getItem('services', req_params)
    return res_data
  }

  editService(req_params, data) {
    this.checkIfTeamExists(req_params)
    const res_data = this.db.updateItem('services', req_params, data)
    return res_data
  }

  deleteService(req_params) {
    this.checkIfTeamExists(req_params)
    const res_data = this.db.deleteItem('services', req_params)
    return res_data
  }

  getDeployments(req_params) { }

  async triggerDeployment(req_params, userGroup) {
    const values = this.convertDbToValues()
    this.repo.writeFile(this.valuesPath, values)

    await this.repo.commit(userGroup)
    return await this.repo.push()

  }

  loadValues() {
    const values = this.repo.readFile(this.valuesPath)
    this.convertValuesToDb(values)
  }

  convertValuesToDb(values) {
    const teams = values.teamConfig.teams
    for (let [teamId, teamData] of Object.entries(teams)) {
      // console.log(`${teamId}: ${teamData}`);
      // console.debug(JSON.stringify(teamData))
      const id = { teamId: teamId }
      let teamCloned = Object.assign({}, teamData);
      delete teamCloned.services
      this.createTeam(id, teamCloned)

      teamData.services.forEach(svc => {
        const serviceId = { teamId: teamId, serviceId: svc.name }
        svc['serviceType'] = {}
        if ('ksvc' in svc)
        {
          svc.serviceType['ksvc'] = svc.ksvc
          delete svc.ksvc

        }
        if ('svc' in svc){
          svc.serviceType.svc = svc.svc
          delete svc.svc
        }
        console.log(svc)
        this.createService(serviceId, svc)
      })
    }
  }

  convertDbToValues() {
    const teams = {}
    this.getTeams().forEach(el => {
      let teamCloned = Object.assign({}, el);
      const id = el.teamId
      delete teamCloned.teamId
      teams[id] = teamCloned
      let dbServices = this.getServices({ teamId: id })
      let services = new Array()
      dbServices.forEach(svc => {
        let svcCloned = Object.assign({}, svc);
        delete svcCloned.teamId
        delete svcCloned.serviceId
        if ('ksvc' in svcCloned.serviceType)
          svcCloned['ksvc'] = svcCloned.serviceType.ksvc
        if ('svc' in svcCloned.serviceType)
          svcCloned['svc'] = svcCloned.serviceType.svc
        delete svcCloned.serviceType

        services.push(svcCloned)
      })

      teams[id].services = services
    })

    const values = {
      teamConfig: { teams: teams },
    }
    return values
  }
}

module.exports = {
  OtomiStack: OtomiStack,
};