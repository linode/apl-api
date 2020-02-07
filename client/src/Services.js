
import React from 'react';
import ModalWrapper from './Modal'
import Service from './Service'
import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'

class Services extends React.Component {
  state = { showModal: false };

  showModal = () => {
    this.setState({ showModal: true });
  };

  hideModal = () => {
    this.setState({ showModal: false });
  };

  getModal = (teamId) => {
    const body = <Service teamId={teamId} />

    return (
      <ModalWrapper
        title='Create service'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  getServices = () => {
    console.log('Get servc')
    // console.log(this.routerProps.match.params)
    return (
      <ButtonToolbar>
        <Button
          variant="primary"
          size="lg" active
          onClick={this.showModal}
        >
          Add new service
        </Button>
      </ButtonToolbar>
    )
  }

  render() {
    console.log(this.state.showModal)

    const services = this.getServices()
    let modal = null
    if (this.state.showModal) {
      modal = this.getModal()
    }

    return (
      <div className='Services'>
              { services }
              { modal }
      </div>
      )
  }
}

export default Services;
