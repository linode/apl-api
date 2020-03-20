import React from 'react'
import BootstrapTable from 'react-bootstrap-table-next'

export default class Clusters extends React.Component {
  state = { allClusters: [] }

  componentDidMount() {
    this.getAllClusters()
  }
  getAllClusters = () => {
    console.log('getAllClusters')
    this.props.client
      .getClusterCollection()
      .then(response => {
        this.setState({ allClusters: response.data })
      })
      .catch(error => {
        console.log(error)
      })
  }

  renderClusterCollection = () => {
    const columns = [
      {
        dataField: 'id',
        text: 'Cluster ID',
      },
      {
        dataField: 'k8sVersion',
        text: 'K8s version',
      },
      {
        dataField: 'region',
        text: 'Region',
      },
    ]
    return <BootstrapTable bootstrap4 keyField='id' data={this.state.allClusters} columns={columns} />
  }

  render() {
    if (this.state.error) {
      return <p>{'Error:' + this.state.error}</p>
    }
    if (!this.state.allClusters) {
      return <p>{'Loading'}</p>
    }

    let body = this.renderClusterCollection()

    return (
      <div className='Clusters'>
        <h2>Clusters</h2>

        {body}
      </div>
    )
  }
}
