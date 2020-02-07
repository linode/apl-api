import React, { Component } from "react";
import { render } from "react-dom";

import Form from "react-jsonschema-form";
import Schema, { openApiData } from './Schema'


function Service() {
  const schema = new Schema(openApiData).getServiceSchema()
  const log = (type) => console.log.bind(console, type);
  return (
    <div className="Service">
      <Form schema={schema}
        onChange={log("changed")}
        onSubmit={log("submitted")}
        onError={log("errors")} />
    </div>
  )
}

export default Service;
