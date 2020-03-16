
import React from 'react';
import BootstrapTable from 'react-bootstrap-table-next';
import ModalWrapper from './Modal'
import Button from 'react-bootstrap/Button'
import ActionBar from './ActionBar'
import Form from "react-jsonschema-form-bs4";
import Help from './Help'

const CustomDescriptionField = ({ id, description }) => {
  return (
    <Help description={description} id={id} />
  )
};

const fields = {
  DescriptionField: CustomDescriptionField
};


class CreateIngress extends React.Component {

  onSubmit = (form) => {

    // const data = this.props.schema.convertFormTeamDataOpenApiData(form.formData)
    this.props.client.createIngress(null, form.formData).then((response) => {
      // console.log('saved');
      this.props.onSubmitted()
    }).catch((error) => {
      console.log(error);
    })
  }
  render() {

    const schema = this.props.schema.getIngressSchema(this.props.clusters)
    const uiSchema = this.props.schema.getIngressUiSchema()

    return (
      <div className="createIngress">
        <Form
          key='serviceId'
          fields={fields}
          schema={schema}
          uiSchema={uiSchema}
          onSubmit={this.onSubmit}
        // liveValidate={true}
        />
      </div>
    )

  }
}
export default class Ingress extends React.Component {
  state = { showModal: false, ingressCollection: [] };

  componentDidMount() {
    this.getIngressCollection()

  }

  getIngressCollection = () => {
    console.log('getIngressCollection')
    this.props.client.getIngressCollection().then((response) => {
      console.log(response.data)
      this.setState({ ingressCollection: response.data })
    }).catch((error) => {
      console.log(error);
    })
  }

  showModal = () => {
    this.setState({ showModal: true });
  };

  hideModal = () => {
    this.setState({ showModal: false });
    this.getIngressCollection()
  };

  getModal = () => {
    const body = <CreateIngress
      schema={this.props.schema}
      client={this.props.client}
      onSubmitted={this.hideModal}
    />

    return (
      <ModalWrapper
        title='Create ingress'
        body={body}
        onClose={this.hideModal}
      />
    )
  }

  ActionBar = () => {
    return (
      <ActionBar client={this.props.client} >
        <Button
          variant="primary"
          size="sm" active
          onClick={this.showModal}
        >
          + new ingress
        </Button>
      </ActionBar>
    )
  }

  renderAddIngressModal = () => {
    return (
      this.getModal()
    )
  }


  renderIngressCollection = () => {

    const columns = [
      {
        dataField: 'domain',
        text: 'Domain',
      },
      {
        dataField: 'serviceId',
        text: 'Service',
      }, {
        dataField: 'isPublic',
        text: 'OAuth',
      }
    ];

    const ingressCollection = <BootstrapTable
      bootstrap4 keyField='name' 
      data={this.state.ingressCollection} 
      columns={columns} />

    return (

      <React.Fragment>
        <h2>Ingress</h2>
        {this.ActionBar()}
        {ingressCollection}
      </React.Fragment>
    )
  }

  render() {
    console.log(this.state.showModal)
    if (this.state.error) {
      return (
        <p>{'Error:' + this.state.error}</p>
      )
    }
    if (!this.state.ingressCollection) {
      return (
        <p>{'Loading'}</p>
      )
    }

    let body = null
    if (this.state.showModal) {
      body = this.getModal()
    } else {
      body = this.renderIngressCollection()
    }

    return (
      <div className='IngressCollection'>
        {body}
      </div>
    )
  }
}

