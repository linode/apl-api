import axios from 'axios'
import { default as OtomiStack } from 'src/otomi-stack'

export default function sendMetrics(apikey: string) {
  const otomiStack = new OtomiStack()
  const client = otomiStack.getApiClient()

  const sendCoresToCloud = async (totalNodes: number, totalMachines: number) => {
    await axios({
      url: 'https://dev.portal.otomi.cloud/api/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        query: `
        mutation addClusterMetrics {
          createClusterInfo(
            data: { 
              coreValue: ${totalNodes}, 
              workerNodeCount: ${totalMachines}, 
              cluster: { connect: { key: "${apikey}" } } }
          )  {
            id
            readingTime
          }
        }
      `,
      },
    })
      .then((result) => {
        console.log('result', result.data.message)
      })
      .catch((err) => {
        console.log('err', err.message)
      })
  }

  setInterval(function () {
    let totalNodes = 0
    let totalMachines = 0
    client.listNode().then((node) => {
      node.body.items.forEach((element) => {
        console.log(
          'from sm',
          `worker node "${element.metadata?.name}" has "${element.status?.capacity?.cpu}" CPU cores`,
        )
        totalNodes += parseInt(element.status?.capacity?.cpu as string)
        totalMachines++
      })
      //console.log('node', node)
      console.log(`for a total of ${totalNodes} nodes`)
      sendCoresToCloud(totalNodes, totalMachines)
    })
  }, 5000)
}
