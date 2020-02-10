import React from 'react';
import axios from 'axios'

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
  state = { loading: true, client: null };


  componentDidMount() {

    axios.get('http://127.0.0.1:8080/v1/apiDocs').then((response) => {
      const apiSpec = response.data
      const client = getClient(apiSpec)

      this.setState({ loading: false, client: client, apiSpec: apiSpec })
    })
      .catch((error) => {
        console.log(error);
      })
  }


  setRouting = () => {
    return (
      <Router>
        <Switch>
          <Route path="/teams/:teamId/services/:serviceId" >
            <Service client={this.state.client} />
          </Route>
          <Route path="/teams/:teamId/services">
            <Services client={this.state.client} />
          </Route>
          <Route path="/teams/:teamId">
            <Team client={this.state.client} />
          </Route>
          <Route path="/teams/">
            <Teams client={this.state.client} />
          </Route>
          <Route path="/">
            <Home client={this.state.client} />
          </Route>
        </Switch >
      </Router>
    )
  }

  renderAppLoading = () => {
    return (
      'App loading'
    )
  }

  renderAppLoaded = () => {
    return this.setRouting()
  }
  render() {
    console.log('App')
    console.log(this.state.client)

    let body = undefined
    if (this.state.loading) {
      body = this.renderAppLoading()
    } else {
      body = this.renderAppLoaded()
    }
    return (
      <div className='App'>
        <Container>
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
