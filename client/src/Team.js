import React from "react";
import Form from "react-jsonschema-form-bs4";
import Services from './Services'
import Help from './Help'
import BootstrapTable from 'react-bootstrap-table-next';


const log = (type) => console.log.bind(console, type);

const CustomDescriptionField = ({ id, description }) => {
  return (
    <Help description={description} id={id} />
  )
};

const fields = {
  DescriptionField: CustomDescriptionField
};

class CreateTeam extends React.Component {

  onSubmit = (form) => {

    // const data = this.props.schema.convertFormTeamDataOpenApiData(form.formData)
    this.props.client.createTeam(null, form.formData).then((response) => {
      // console.log('saved');
      this.props.onSubmitted()
    }).catch((error) => {
      console.log(error);
    })
  }
  render() {

    const schema = this.props.schema.getTeamSchema(this.props.clusters)
    const uiSchema = this.props.schema.getTeamUiSchema()

    return (
      <div className="Team">
        <Form
          key='createTeam'
          fields={fields}
          schema={schema}
          uiSchema={uiSchema}
          onChange={log("changed")}
          onSubmit={this.onSubmit}
          onError={log("errors")}

        // liveValidate={true}
        />
      </div>
    )

  }
}

class Team extends React.Component {
  state = { team: null, allClusters: null, error: null }

  componentDidMount() {
    this.getTeam()
    this.getClusters()
  }

  getTeam = () => {
    console.log('getTeam')
    this.props.client.getTeam(this.props.teamId).then((response) => {
      console.log(response.data)
      this.setState({ team: response.data })
    }).catch((error) => {
      console.log(error)
      this.setState({ error: error })
    })
  }

  getClusters = () => {
    console.log('getClusters')
    this.props.client.getClusterCollection().then((response) => {
      this.setState({ allClusters: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

  renderTeamDetails = (formData) => {
    const schema = this.props.schema.getTeamSchema(formData.clusters)
    const uiSchema = this.props.schema.getTeamUiSchema()

    const columns = [{
      dataField: 'id',
      text: 'Cluster ID'
    }, {
      dataField: 'k8sVersion',
      text: 'K8s version'
    }, {
      dataField: 'region',
      text: 'Region'
    }];

    const clusters = this.state.allClusters.filter(el => this.state.team.clusters.includes(el.id))
    return (
      <React.Fragment>
        <h4>OIDC</h4>
        <div>
          <p>Client ID: {this.state.team.oidc.clientID}</p>
          
        </div>
        <h3>Available clusters</h3>
        <BootstrapTable bootstrap4 keyField='id' data={clusters} columns={columns} />
      </React.Fragment>
    )


    // return <Form
    //   key='TeamDetails'
    //   formData={formData}
    //   fields={fields}
    //   schema={schema}
    //   uiSchema={uiSchema}
    //   disabled>
    //   <div></div>
    // </Form>
  }

  render() {
    if (this.state.error) {
      return (
        <p>{'Error:' + this.state.error}</p>
      )
    }
    if (!this.state.team || !this.state.allClusters) {
      return (
        <p>{'Loading'}</p>
      )
    }

    const teamDetails = this.renderTeamDetails(this.state.team)
    // console.log(this.state.team)
    return (
      <div className="Team">
        <h2>Team configuration</h2>
        {teamDetails}
        <h3>Services:</h3>

        <Services schema={this.props.schema} client={this.props.client} team={this.state.team} />
      </div>
    )

  }
}

export { CreateTeam };
export default Team;
