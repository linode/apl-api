import React from 'react';
import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'


class NavigationBar extends React.Component {

  render() {
    return (

      <Navbar bg="light" >
        <Navbar.Brand href="/">
          <img
            src="/static/otomi_stack_medium.png"
            width="40"
            height="40"
            className="d-inline-block align-top"
            alt="logo"
          />
        </Navbar.Brand>
        <Navbar.Brand href="/">Team management dashboard</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            {/* <Nav.Link href="#home">Home</Nav.Link>
              <Nav.Link href="#link">Link</Nav.Link> */}
          </Nav>
          <Navbar.Brand>
            <img
              src="/static/user.svg"
              width="30"
              height="30"
              className="d-inline-block align-top"
              alt="user icon"
            />
          </Navbar.Brand>
          <Navbar.Text>
            user@redkubes.com (Admin)
          </Navbar.Text>
        </Navbar.Collapse>
      </Navbar>
    )
  }
}

export default NavigationBar;
