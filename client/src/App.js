import React from 'react';
import axios from 'axios'
import Schema, { openApiData } from './Schema'

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import './App.css';

import Home from './Home'
import Service from './Service'
import Services from './Services'
import Team from './Team'
import Teams from './Teams'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Navbar from 'react-bootstrap/Navbar'



import getClient from './client'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    // console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}


class App extends React.Component {
  state = { loading: true, client: null, schema: null };


  componentDidMount() {

    axios.get('http://127.0.0.1:8080/v1/apiDocs').then((response) => {
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
        {/* <Navbar expand="lg" bg="dark" variant="dark">
        <Navbar.Brand href="#home"></Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <Navbar.Text>
            Signed in as: <a href="#login">Mark Otto</a>
            <img src="/static/user.svg" alt="user icon" />
          </Navbar.Text>
        </Navbar.Collapse>
      </Navbar> */}
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
        <Container className="mx-auto">
          <Row>{nav}</Row>
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
