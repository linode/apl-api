import React from "react";
import Form from "react-jsonschema-form-bs4";
import Services from './Services'
import Help from './Help'


const log = (type) => console.log.bind(console, type);

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

    const data = this.props.schema.convertTeamJsonSchemaToOpenApiSchema(form.formData)
    this.props.client.createTeam(null, data).then((response) => {
      // console.log('saved');
      this.props.onSubmitted()
    }).catch((error) => {
      console.log(error);
    })
  }
  render() {
    const schema = this.props.schema.getTeamSchema(this.props.clusters)
    const uiSchema = this.props.schema.getTeamUiSchema(schema)

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
  state = {team: {}}

  componentDidMount() {
    this.getTeam()
  }

  getTeam = () => {
    console.log('getTeam')
    this.props.client.getTeam(this.props.teamId).then((response) => {
      this.setState({ team: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

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
