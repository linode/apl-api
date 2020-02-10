import React, { Component } from "react";
import Form from "react-jsonschema-form";
import Services from './Services'

const log = (type) => console.log.bind(console, type);

class CreateTeam extends React.Component {

  onSubmit = (form) => {
    this.props.client.createTeam(null, form.formData).then((response) => {
      console.log('saved');
      this.props.onSubmitted()
    }).catch((error) => {
      console.log(error);
    })
  }
  render() {
    const schema = this.props.schema.getTeamSchema()


    return (

      <div className="Team">
        <Form
          key='createTeam'
          schema={schema}
          onChange={log("changed")}
          onSubmit={this.onSubmit}
          onError={log("errors")}

        // liveValidate={true}
        />
      </div>
    )

  }
}

class Team extends React.Component {

  render() {
    return (
      <div className="Team">
        <Services schema={this.props.schema} client={this.props.client} teamId={this.props.teamId} />
      </div>
    )

  }
}

export { CreateTeam };
export default Team;
