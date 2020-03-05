
import React from 'react';
import ModalWrapper from './Modal'
import { CreateTeam } from './Team'
import Button from 'react-bootstrap/Button'
import { Link } from "react-router-dom";
import ActionBar from './ActionBar'
import BootstrapTable from 'react-bootstrap-table-next';


function getTeamLink(cell, row, rowIndex, formatExtraData) {
  return <Link to={`/teams/${row.name}`}>{row.name}</Link>
}


class Teams extends React.Component {
  state = { showModal: false, teams: [], allClusters: [] };

  componentDidMount() {
    this.getData()
    this.getClusters()

  }
  getClusters = () => {
    console.log('getClusters')
    this.props.client.getClusterCollection().then((response) => {
      this.setState({ allClusters: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

  getData = () => {
    console.log('getData')
    this.props.client.getTeamCollection().then((response) => {
      this.setState({ teams: response.data })
    }).catch((error) => {
      this.setState({ error: error })
    })
  }

  showModal = () => {
    this.setState({ showModal: true });
  };

  hideModal = () => {
    this.setState({ showModal: false });
    this.getData()
  };

  getModal = () => {
    const cluster_ids = this.state.allClusters.map(cluster => cluster.id)
    const body = <CreateTeam
      schema={this.props.schema}
      clusters={cluster_ids}
      client={this.props.client}
      onSubmitted={this.hideModal}
    />

    return (
      <ModalWrapper
        title='Create team'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  TeamActionBar = () => {
    return (

      <ActionBar client={this.props.client} >
        <Button
          variant="primary"
          size="sm" active
          onClick={this.showModal}
        >
          + new team
        </Button>
      </ActionBar>
    )
  }

  renderAddTeamModal = () => {
    return (
      this.getModal()
    )
  }

  renderClusterCollection = () => {

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
    return <BootstrapTable bootstrap4 keyField='id' data={this.state.allClusters} columns={columns} />
  }


  renderTeamCollection = () => {

    const columns = [{
      dataField: 'name',
      text: 'Team name',
      formatter: getTeamLink,
    }];

    const teams = <BootstrapTable bootstrap4 keyField='name' data={this.state.teams} columns={columns} />

    return (

      <React.Fragment>
        <h2>Clusters</h2>
        {this.renderClusterCollection()}

        <h2>Teams</h2>
        {this.TeamActionBar()}
        {teams}
      </React.Fragment>
    )
  }

  render() {
    console.log(this.state.showModal)
    if (this.state.error) {
      return (
        <p>{'Error:' + this.state.error}</p>
      )
    }
    if (!this.state.teams || !this.state.allClusters) {
      return (
        <p>{'Loading'}</p>
      )
    }

    let body = null
    if (this.state.showModal) {
      body = this.getModal()
    } else {
      body = this.renderTeamCollection()
    }

    return (
      <div className='Teams'>
        {body}
      </div>
    )
  }
}

export default Teams;
