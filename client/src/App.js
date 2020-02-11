import React from 'react';
import Schema from './Schema'

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import './App.css';

import Service from './Service'
import Services from './Services'
import Teams from './Teams'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'



import getClient, { getApiDefinition } from './client'

class App extends React.Component {
  state = { loading: true, client: null, schema: null };


  componentDidMount() {
    console.log('componentDidMount')
    getApiDefinition().then((response) => {
      const apiSpec = response.data
      const client = getClient(apiSpec)
      const schema = new Schema(apiSpec)

      this.setState({ loading: false, client: client, schema: schema })
    })
      .catch((error) => {
        console.log(error);
      })
  }


  setRouting = () => {
    return (

      <Router>
        <Switch>
          <Route
            exact path="/teams/:teamId/services/:serviceId"
            render={(props) =>
              <Service
                teamId={props.match.params.teamId}
                serviceId={props.match.params.serviceId}
                client={this.state.client}
                schema={this.state.schema} />
            }
          />
          <Route exact path="/teams/:teamId"
            render={(props) =>
              <Services
                teamId={props.match.params.teamId}
                client={this.state.client}
                schema={this.state.schema} />
            }
          />

          <Route exact path="/teams/">
            <Teams client={this.state.client} schema={this.state.schema} />
          </Route>
          <Route path="/">
            <Teams client={this.state.client} schema={this.state.schema} />
          </Route>
        </Switch >
      </Router >
    )
  }

  renderAppLoading = () => {
    return (
      'App loading'
    )
  }

  renderNavBar = () => {
    return (
      <React.Fragment>
        <Navbar bg="light" >
          <Navbar.Brand href="#home">
            <img
              src="/static/otomi_stack_medium.png"
              width="40"
              height="40"
              className="d-inline-block align-top"
              alt="logo"
            />
          </Navbar.Brand>
          <Navbar.Brand href="/">Team management panel</Navbar.Brand>
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
      </React.Fragment>
    )
  }

  renderAppLoaded = () => {
    return this.setRouting()
  }
  render() {
    console.log('App')

    const nav = this.renderNavBar()
    let body = undefined
    if (this.state.loading) {
      body = this.renderAppLoading()
    } else {
      body = this.renderAppLoaded()
    }
    return (
      <div className='App'>
        {nav}
        <Container className='mt-2'>
          <Row></Row>
          <Row>
            <Col>
              {body}
            </Col>
          </Row>
        </Container>
      </div>
    )
  }
}



export default App;
