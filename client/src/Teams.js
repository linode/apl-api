
import React from 'react';
import ModalWrapper from './Modal'
import CreateTeam from './Team'
import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import { Link } from "react-router-dom";

class Teams extends React.Component {
  state = { showModal: false, teams: [] };

  componentDidMount() {
    this.props.client.getTeamCollection().then((response) => {
      console.log(response)
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
  };

  getModal = (teamId) => {
    const body = <CreateTeam schema={this.props.schema} client={this.props.client} />

    return (
      <ModalWrapper
        title='Create team'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  renderAddTeamButton = () => {
    return (
      <ButtonToolbar>
        <Button
          variant="primary"
          size="sm" active
          onClick={this.showModal}
        >
          Add new team
        </Button>
      </ButtonToolbar>
    )
  }

  renderAddTeamModal = () => {
    return (
      this.getModal()
    )
  }

  renderItem(link) {
    return (
      <React.Fragment>
      </React.Fragment>
    )
  }
  renderTeamCollection = () => {

    const button = this.renderAddTeamButton()
    const items = this.state.teams.map((item) => {
      console.log(item)

      const link = `/teams/${item.teamId}`
      return (
        <li><Link to={link}>{item.name}</Link></li>
      )
    })
    return (

      <React.Fragment>
        <Container>
          <Row className="mb-1">
            {button}
          </Row>
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
