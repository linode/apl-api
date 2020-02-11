import React from "react";

import Form from "react-jsonschema-form";

const log = (type) => console.log.bind(console, type);

const uiSchema = {
  serviceId: {"ui:widget": "hidden"},
  teamId: {"ui:widget": "hidden"},
  svc: {"ui:widget": "hidden"}
};


class Service extends React.Component {
  state = { service: {} };

  componentDidMount() {
    this.getData()
  }

  getData = () => {
    console.log(this.props.serviceId)
    this.props.client.getServiceFromTeam({teamId: this.props.teamId, serviceId: this.props.serviceId}).then((response) => {
      this.setState({ service: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

  render() {
    const schema = this.props.schema.getServiceSchema()

    return (
      <div className="Service">
        <Form 
          schema={schema}
          uiSchema={uiSchema}
          disabled
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

export { CreateService };
export default Service;
