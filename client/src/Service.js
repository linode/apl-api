import React from "react";

import Form from "react-jsonschema-form";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { IoIosHelpCircle } from "react-icons/io";

const log = (type) => console.log.bind(console, type);

const uiSchema = {
  serviceId: { "ui:widget": "hidden" },
  teamId: { "ui:widget": "hidden" },
  svc: { "ui:widget": "hidden" }
};



const CustomDescriptionField = ({ id, description }) => {

  function renderTooltip(props) {
    return <Tooltip {...props}>{description}</Tooltip>;
  }

  function renderOverlay() {
    return (
    <OverlayTrigger
      placement="right"
      delay={{ show: 250, hide: 400 }}
      overlay={renderTooltip}>
      <IoIosHelpCircle />
    </OverlayTrigger>
    )
  }
  let desc = null
  if(description)
    desc = renderOverlay()

  return (
    desc
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

        // liveValidate={true}
        />
      </div>
    )

  }
}

export { CreateService };
export default Service;
