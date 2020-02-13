import React from "react";
import Form from "react-jsonschema-form-bs4";
import Services from './Services'
import Help from './Help'


const log = (type) => console.log.bind(console, type);

const uiSchema = {
  teamId: { "ui:widget": "hidden" },
  password: { "ui:widget": "password" },
};

const CustomDescriptionField = ({ id, description }) => {
  return (
    <Help description={description} id={id} />
  )
};

const fields = {
  DescriptionField: CustomDescriptionField
};

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
          fields={fields}
          schema={schema}
          uiSchema={uiSchema}
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
        <h2>Team: {this.props.teamId}</h2>
        <Services schema={this.props.schema} client={this.props.client} teamId={this.props.teamId} />
      </div>
    )

  }
}

export { CreateTeam };
export default Team;
