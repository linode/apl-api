
import React from 'react';
import ModalWrapper from './Modal'
import { CreateService } from './Service'
import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import { Link } from "react-router-dom";
import ActionBar from './ActionBar'


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

    const items = this.state.services.map((item) => {
      console.log(item)

      const link = `/teams/${this.props.team.name}/services/${item.serviceId}`
      return (
        <li><Link to={link}>{item.name}</Link></li>
      )
    })

    return (

      <React.Fragment>
        {this.ServiceActionBar()}

        <Container>
          <Row>
            <ul className="mt-2">
              {items}
            </ul>
          </Row>
        </Container>

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
