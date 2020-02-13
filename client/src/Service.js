import React from "react";
import Form from "react-jsonschema-form-bs4";
// npm install react-jsonschema-form-bs4
import Help from './Help'

const log = (type) => console.log.bind(console, type);

const uiSchema = {
  serviceId: { "ui:widget": "hidden" },
  teamId: { "ui:widget": "hidden" },
};

const CustomDescriptionField = ({ id, description }) => {
  return (
    <Help description={description} id={id}/>
  )
};

const fields = {
  DescriptionField: CustomDescriptionField
};

class Service extends React.Component {
  state = { service: {} };

  componentDidMount() {
    this.getData()
  }

  getData = () => {
    console.log(this.props.serviceId)
    this.props.client.getServiceFromTeam({ teamId: this.props.teamId, serviceId: this.props.serviceId }).then((response) => {
      this.setState({ service: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

  render() {
    const schema = this.props.schema.getServiceSchema()

    return (
      <div className="Service">
        <h2>Service: {this.props.serviceId}</h2>

        <Form
          schema={schema}
          uiSchema={uiSchema}
          disabled
          fields={fields}
          formData={this.state.service}

        >
          <div></div>
        </Form>
      </div>
    )
  }
}

class CreateService extends React.Component {

  onSubmit = (form) => {
    this.props.client.addServiceToTeam(this.props.teamId, form.formData).then((response) => {
      console.log('saved');
      this.props.onSubmitted()
    }).catch((error) => {
      console.log(error);
    })
  }
  render() {
    const schema = this.props.schema.getServiceSchema()
    return (

      <div className="Service">
        <Form
          key='createService'
          schema={schema}
          fields={fields}
          uiSchema={uiSchema}
          onChange={log("changed")}
          onSubmit={this.onSubmit}
          onError={log("errors")}
          liveValidate={true}
        />
      </div>
    )

  }
}

export { CreateService };
export default Service;
