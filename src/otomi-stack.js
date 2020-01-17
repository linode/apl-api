class OtomiStack {
  constructor(repo, db) {
    this.db = db
    this.repo = repo
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
    const res_data = this.db.deleteItem('teams', req_params)
    return res_data
  }

  getServices(req_params) {
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

  triggerDeployment(req_params) {
    const values = this.convertDbToValues()
    this.repo.saveFile('./values/teams.yaml', values)
    this.repo.commit()
    this.repo.push()
  }

  loadValues() {
    const values = this.repo.readFile('./values/teams.yaml')
    this.convertValuesToDb(values)
  }

  convertValuesToDb(values) {
    const teams = values.teams

    teams.forEach(team => {
      const id = { teamId: team.name }
      let teamCloned = Object.assign({}, team);
      delete teamCloned.services
      this.db.createTeam(teamCloned, id)

      team.services.forEach(svc => {
        const id = { teamId: team.name, serviceId: svc.name }
        this.createService(id, svc)
      })
      this.db.createService
    }
    )
  }

  convertDbToValues() {

    const values = {
      teams: []
    }
    const teams = this.getTeams()
    teams.forEach(el => {
      let team = el
      team.services = this.getServices({ teamId: el.name })
      values.teams.push(team)
    })

    console.log(values)
    return values
  }
}


module.exports = {
  OtomiStack: OtomiStack,
};