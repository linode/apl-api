import axios from 'axios'

export default async function connect(): Promise<string | void> {
  console.log('hello world from otomi cloud function')
  // await axios({
  //   url: 'http://localhost:3000/api/graphql',
  //   method: 'post',
  //   data: {
  //     query: `
  //                     mutation UpdateApiCluster(
  //                         $key: cla9msf8f0210gcgtdf2q3lxq
  //                     ) {
  //                         updateCluster(
  //                             where: { key: $key }
  //                             data: {
  //                                 status: "UP"
  //                             }
  //                         ) {
  //                             updatedAt
  //                         }
  //                     }
  //                 `,
  //   },
  // })
  //   .then((result) => {
  //     console.log('otomi cloud: ', result.data)
  //   })
  //   .catch((error) => {
  //     console.error('otomi cloud error: ', error.message)
  //   })

  await axios({
    url: 'http://localhost:3000/api/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      query: `
        mutation Cluster {
          updateCluster(
            where: {key: "cla9msf8f0210gcgtdf2q3lxq"}
            data: {status: {set: UP}}
            ) {
            id
            domainSuffix
            name
            provider
            region
            key
            status
          }
        }
    `,
    },
  })
    .then((result) => {
      console.log('otomi cloud: ', result.data)
    })
    .catch((error) => {
      console.error('otomi cloud error: ', error.message)
    })

  return 'connected'
}
