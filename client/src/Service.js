import React from "react";
import Form from "react-jsonschema-form-bs4";
// npm install react-jsonschema-form-bs4
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

class Service extends React.Component {
  state = { service: null, clusters: null, error: null };

  componentDidMount() {
    this.getService()
    this.getTeam()
  }

  getTeam = () => {
    console.log('getTeam')
    this.props.client.getTeam(this.props.teamId).then((response) => {
      console.log(response)
      this.setState({ clusters: response.data.clusters })
    }).catch((error) => {
      this.setState({ error: error })
    })
  }

  getService = () => {
    console.log('getService ' + this.props.serviceId)
    this.props.client.getServiceFromTeam({ teamId: this.props.teamId, serviceId: this.props.serviceId }).then((response) => {
      this.setState({ service: response.data })
    }).catch((error) => {
      this.setState({ error: error })
    })
  }

  render() {
    if (this.state.error) {
      return (
        <p>{'Error: ' + this.state.error}</p>
      )
    }
    if (!this.state.service || !this.state.clusters) {
      return (
        <p>{'Loading'}</p>
      )
    }
    const schema = this.props.schema.getServiceSchema(this.state.clusters)
    const uiSchema = this.props.schema.getServiceUiSchema(schema)
    const service = this.state.service
    return (
      <div className="Service">
        <h2>Service: {this.props.serviceId}</h2>

        <Form
          schema={schema}
          uiSchema={uiSchema}
          disabled
          fields={fields}
          formData={service}

        >
          <div></div>
        </Form>
      </div>
    )
  }
}

class CreateService extends React.Component {
  state = { error: null }
  onSubmit = (form) => {
    const data = form.formData
    this.props.client.addServiceToTeam(this.props.teamId, data).then((response) => {
      console.log('saved');
      this.props.onSubmitted()
    }).catch((error) => {
      console.log(error);
    })
  }
  render() {

    const schema = this.props.schema.getServiceSchema(this.props.clusters)
    const uiSchema = this.props.schema.getServiceUiSchema(schema)
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
