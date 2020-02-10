
import React from 'react';
import ModalWrapper from './Modal'
import Team from './Team'
import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'

class Teams extends React.Component {
  state = { showModal: false, teams: []};

  componentDidMount(){
    this.props.client.getTeamCollection().then((response) => {
      this.setState({teams: response.data})
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
    const body = <Team />

    return (
      <ModalWrapper
        title='Create service'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  getTeams = () => {
    console.log('Get servc')
    console.log(this.state.teams)
    // this.state.teams.map(item => (
    //   // Without the `key`, React will fire a key warning
    //   <React.Fragment key={item.id}>
    //     <dt>{item.term}</dt>
    //     <dd>{item.description}</dd>
    //   </React.Fragment>
    // ))}
    // console.log(this.routerProps.match.params)
    return (
      <ButtonToolbar>
        <Button
          variant="primary"
          size="lg" active
          onClick={this.showModal}
        >
          Add new team
        </Button>
      </ButtonToolbar>
    )
  }

  render() {
    console.log(this.state.showModal)

    const teams = this.getTeams()
    let modal = null
    if (this.state.showModal) {
      modal = this.getModal()
    }

    return (
      <div className='Services'>
              { teams }
              { modal }
      </div>
      )
  }
}

export default Teams;
