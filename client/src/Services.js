
import React from 'react';
import ModalWrapper from './Modal'
import {CreateService} from './Service'
import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import { Link } from "react-router-dom";

class Services extends React.Component {
  state = { showModal: false, services: [] };

  componentDidMount() {
    this.getData()
  }

  getData = () => {

    console.log('getData')
    this.props.client.getServiceCollectionFromTeam(this.props.teamId).then((response) => {
      console.log(response)
      this.setState({ services: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

  showModal = () => {
    this.setState({ showModal: true });
  };

  hideModal = () => {
    this.setState({ showModal: false });
    this.getData()
  };

  getModal = (teamId) => {
    const body = <CreateService teamId={teamId} />

    return (
      <ModalWrapper
        title='Create service'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  renderServiceCollection = () => {

    const button = this.renderAddServiceButton()
    const items = this.state.services.map((item) => {
      console.log(item)

      const link = `/teams/${this.props.teamId}/services/${item.serviceId}`
      return (
        <li><Link to={link}>{item.name}</Link></li>
      )
    })

    return (

      <React.Fragment>
        <Container>
          <Row className="mb-1">
            {button}
          </Row>
          <Row>
            <ul>
              {items}
            </ul>
          </Row>
        </Container>

      </React.Fragment>
    )
  }

  renderAddServiceButton = () => {
    return (
      <ButtonToolbar>
        <Button
          variant="primary"
          size="sm" active
          onClick={this.showModal}
        >
          Add new service
        </Button>
      </ButtonToolbar>
    )
  }

  render() {
    console.log(this.state.showModal)

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
