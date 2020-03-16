
import React from 'react';
import ModalWrapper from './Modal'
import { CreateService } from './Service'
import Button from 'react-bootstrap/Button'
import { Link } from "react-router-dom";
import ActionBar from './ActionBar'
import BootstrapTable from 'react-bootstrap-table-next';


function ServiceTable(props) {

  function getServiceLink(cell, row, rowIndex, formatExtraData) {
    const link = `/teams/${row.teamId}/services/${row.serviceId}`
    return <Link to={link}>{row.name}</Link>
  }
  const columns = [{
    dataField: 'name',
    text: 'Service name',
    formatter: getServiceLink,
  }];

  return (
    <BootstrapTable bootstrap4 keyField='name' data={props.services} columns={columns} />
  )
}

class Services extends React.Component {
  state = { showModal: false, services: [], error: null };

  componentDidMount() {
    this.getData()
  }

  getTeamServices() {
    this.props.client.getServiceCollectionFromTeam(this.props.team.name).then((response) => {
      this.setState({ services: response.data })
    }).catch((error) => {
      this.setState({ error: error })
    })
  }

  getAllServices() {
    this.props.client.getAllServices().then((response) => {
      this.setState({ services: response.data })
    }).catch((error) => {
      this.setState({ error: error })
    })   
  }

  getData = () => {
    console.log('getData')
    if (this.props.team === undefined)
      this.getAllServices()
    else
      this.getTeamServices()
  }

  showModal = () => {
    this.setState({ showModal: true });
  };

  hideModal = () => {
    this.setState({ showModal: false });
    this.getData()
  };

  getModal = () => {
    const body = <CreateService
      client={this.props.client}
      schema={this.props.schema}
      clusters={this.props.team.clusters}
      teamId={this.props.team.name}
      onSubmitted={this.hideModal}
    />

    return (
      <ModalWrapper
        title='Create service'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  renderServiceCollection = () => {

    return (
      <React.Fragment>
        {this.ServiceActionBar()}
        <ServiceTable services={this.state.services}/>
      </React.Fragment>
    )
  }

  ServiceActionBar = () => {
    if (this.props.team === undefined)
      return

    return (

      <ActionBar client={this.props.client}>
        <Button
          variant="primary"
          size="sm" active
          onClick={this.showModal}
        >
          + new service
        </Button>
      </ActionBar>
    )
  }

  render() {
    console.log(this.state.showModal)
    if (this.state.error) {
      return (
        <p>{'Error: ' + this.state.error}</p>
      )
    }
    if (!this.state.services) {
      return (
        <p>{'Loading'}</p>
      )
    }

    let body = null
    if (this.state.showModal) {
      body = this.getModal()
    } else {
      body = this.renderServiceCollection()
    }

    return (
      <div className='Services'>
        {body}
      </div>
    )
  }
}

export default Services;
