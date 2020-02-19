
import React from 'react';
import ModalWrapper from './Modal'
import { CreateTeam } from './Team'
import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import { Link } from "react-router-dom";
import ActionBar from './ActionBar'

class Teams extends React.Component {
  state = { showModal: false, teams: [], clusters: [] };

  componentDidMount() {
    this.getData()
    this.getClusters()

  }
  getClusters = () => {
    console.log('getClusters')
    this.props.client.getClusterCollection().then((response) => {
      this.setState({ clusters: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

  getData = () => {
    console.log('getData')
    this.props.client.getTeamCollection().then((response) => {
      this.setState({ teams: response.data })
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

  getModal = () => {
    const body = <CreateTeam
      schema={this.props.schema}
      clusters={this.state.clusters}
      client={this.props.client}
      onSubmitted={this.hideModal}
    />

    return (
      <ModalWrapper
        title='Create team'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  TeamActionBar = () => {
    return (

      <ActionBar client={this.props.client} >
        <Button
          variant="primary"
          size="sm" active
          onClick={this.showModal}
        >
          + new team
        </Button>
      </ActionBar>
    )
  }

  renderAddTeamModal = () => {
    return (
      this.getModal()
    )
  }

  renderTeamCollection = () => {

    const items = this.state.teams.map((item) => {
      console.log(item)

      const link = `/teams/${item.teamId}`
      return (
        <li><Link to={link}>{item.name}</Link></li>
      )
    })
    return (

      <React.Fragment>
        <h2>Teams</h2>

        {this.TeamActionBar()}
        <Container>
          <Row>
            <ul>
              {items}
            </ul>
          </Row>
        </Container>

      </React.Fragment>
    )
  }

  render() {
    console.log(this.state.showModal)

    let body = null
    if (this.state.showModal) {
      body = this.getModal()
    } else {
      body = this.renderTeamCollection()
    }

    return (
      <div className='Teams'>
        {body}
      </div>
    )
  }
}

export default Teams;
