import React, { Component } from "react";

import Form from "react-jsonschema-form";
import Schema, { openApiData } from './Schema'

const log = (type) => console.log.bind(console, type);

function Service() {
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

export default Service;
