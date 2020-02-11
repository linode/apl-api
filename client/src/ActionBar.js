import React from 'react';
import Navbar from 'react-bootstrap/Navbar'
import Button from 'react-bootstrap/Button'


class ActionBar extends React.Component {

  onDeployButtonClick = (form) => {
    this.props.client.deploy().then((response) => {
      console.log('Scheduled for deployment');
    }).catch((error) => {
      console.log(error);
    })
  }

  render() {
    return (

      <Navbar bg="light" expand="sm">
        <Navbar.Brand>Toolbox</Navbar.Brand>

        <Navbar.Collapse id="basic-navbar-nav">
          <div className="mr-auto">
          {this.props.children}
          </div>

          <Button
            onClick={this.onDeployButtonClick}
            variant="dark"
            size="sm"
          >
            Deploy
      </Button>

        </Navbar.Collapse>
      </Navbar>
    )
  }
}

export default ActionBar;