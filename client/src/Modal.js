import React from "react";
import Button from 'react-bootstrap/Button'

import Modal from 'react-bootstrap/Modal'

const log = (type) => console.log.bind(console, type);

class ModalWrapper extends React.Component {
  onClose = () => {
    log('onClose')
    this.props.onClose()
  }
  
  render() {
    return (
      <Modal.Dialog>
      <Modal.Header>
        <Modal.Title>{this.props.title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {this.props.body}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={this.onClose}
        >Close</Button>
      </Modal.Footer>
    </Modal.Dialog>
    )
  }
}

export default ModalWrapper;
