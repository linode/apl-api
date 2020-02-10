import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useRouteMatch,
  useParams
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


function App() {
  getClient()
  return (
    // <div className="App">

    // </div>
    <div className="App">
      <Container>
        <Row>
          <Col>
            <Router>
              <div>
                <nav>
                  <ul>
                    <li>
                      <Link to="/">Home</Link>
                    </li>
                    <li>
                      <Link to="/teams">Teams</Link>
                    </li>
                  </ul>
                </nav>

                {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}
                <Switch>
                  <Route path="/teams/:teamId/services/:serviceId">
                    <Service />
                  </Route>
                  <Route path="/teams/:teamId/services">
                    <Services />
                  </Route>
                  <Route path="/teams/:teamId">
                    <Team />
                  </Route>
                  <Route path="/teams/">
                    <Teams />
                  </Route>
                  <Route path="/">
                    <Home />
                  </Route>
                </Switch>
              </div>
            </Router>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
