import React from "react";
import Schema from "./Schema";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import "./App.css";

import Service from "./Service";
import Team from "./Team";
import Teams from "./Teams";
import Clusters from "./Clusters";
import Ingress from "./Ingress";
import Services from "./Services";
import Overview from "./Overview";
import getClient, { getApiDefinition } from "./client";
import Dashboard from "./Dashboard";

class App extends React.Component {
  state = { loading: true, client: null, schema: null };

  componentDidMount() {
    console.log("componentDidMount");
    getApiDefinition()
      .then(response => {
        const apiSpec = response.data;
        const client = getClient(apiSpec);
        const schema = new Schema(apiSpec);

        this.setState({ loading: false, client: client, schema: schema });
      })
      .catch(error => {
        console.log(error);
      });
  }

  setRouting = () => {
    return (
      <Router>
        <Dashboard client={this.state.client}>
          <Switch>
            <Route
              exact
              path="/teams/:teamId/services/:serviceId"
              render={props => (
                <Service
                  teamId={props.match.params.teamId}
                  serviceId={props.match.params.serviceId}
                  client={this.state.client}
                  schema={this.state.schema}
                />
              )}
            />
            <Route
              exact
              path="/teams/:teamId"
              render={props => (
                <Team
                  teamId={props.match.params.teamId}
                  client={this.state.client}
                  schema={this.state.schema}
                />
              )}
            />

            <Route exact path="/teams/">
              <Teams client={this.state.client} schema={this.state.schema} />
            </Route>
            <Route exact path="/clusters/">
              <Clusters client={this.state.client} schema={this.state.schema} />
            </Route>
            <Route exact path="/services/">
              <Services client={this.state.client} schema={this.state.schema} />
            </Route>
            <Route exact path="/ingress/">
              <Ingress client={this.state.client} schema={this.state.schema} />
            </Route>
            <Route path="/">
              <Overview client={this.state.client} schema={this.state.schema} />
            </Route>
          </Switch>
        </Dashboard>
      </Router>
    );
  };

  renderAppLoading = () => {
    return "App loading";
  };

  renderAppLoaded = () => {
    const routing = this.setRouting();
    return <React.Fragment>{routing}</React.Fragment>;
  };
  render() {
    console.log("App");

    let body = undefined;
    if (this.state.loading) {
      body = this.renderAppLoading();
    } else {
      body = this.renderAppLoaded();
    }
    return (
      <div className="App">
        {body}
        {/* <NavigationBar client={this.state.client} />
        <Container className='mt-2'>
          <Row></Row>
          <Row>
            <Col>
              {body}
            </Col>
          </Row>
        </Container> */}
      </div>
    );
  }
}

export default App;
