
import React from 'react';
import ModalWrapper from './Modal'
import { CreateService } from './Service'
import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import { Link } from "react-router-dom";
import ActionBar from './ActionBar'
import BootstrapTable from 'react-bootstrap-table-next';

class Services extends React.Component {
  state = { showModal: false, services: [], error: null };

  componentDidMount() {
    this.getData()
  }

  getData = () => {
    console.log('getData')
    // console.log(this.props.team)
    this.props.client.getServiceCollectionFromTeam(this.props.team.name).then((response) => {
      // console.log(response)
      this.setState({ services: response.data })
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

    const columns = [{
      dataField: 'name',
      text: 'Service name',
      formatter: this.getServiceLink,
    }];

    const services = <BootstrapTable bootstrap4 keyField='name' data={this.state.services} columns={columns} />

    return (

      <React.Fragment>
        {this.ServiceActionBar()}
        {services}
      </React.Fragment>
    )
  }


  ServiceActionBar = () => {
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

  getServiceLink = (cell, row, rowIndex, formatExtraData) => {
    const link = `/teams/${this.props.team.name}/services/${row.serviceId}`
    return <Link to={link}>{row.name}</Link>
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
