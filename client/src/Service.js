import React, { Component } from "react";

import Form from "react-jsonschema-form";
import Schema, { openApiData } from './Schema'

const log = (type) => console.log.bind(console, type);

function Service(values) {
  const schema = new Schema(openApiData).getServiceSchema()
  
  return (
    <div className="Service">
      <Form schema={schema}
        onChange={log("changed")}
        onSubmit={log("submitted")}
        onError={log("errors")} 
        // liveValidate={true}
      />
    </div>
  )
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
          onChange={log("changed")}
          onSubmit={this.onSubmit}
          onError={log("errors")}

        // liveValidate={true}
        />
      </div>
    )

  }
}

export {CreateService};
export default Service;
