import OpenAPIClientAxios from 'openapi-client-axios';
import axios from 'axios'


function getClient(apiDefinition) {

  let axiosConfigDefaults = {
    withCredentials: true,
    headers: {
      'Cache-Control': 'no-cache',
    },
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn('running in development mode!')
    axiosConfigDefaults = {
      withCredentials: false,
      headers: {
        'Cache-Control': 'no-cache',
        'Auth-Group': 'admin',
      },
    }
  }

  if (process.env.NODE_ENV !== "production") {
    apiDefinition.servers = [{
      url: 'http://127.0.0.1:8080/v1'
    }]
  }

  const api = new OpenAPIClientAxios({
    definition: apiDefinition,
    axiosConfigDefaults: axiosConfigDefaults
  });

  return api.initSync();
}

async function getApiDefinition() {
  let url = '/v1/apiDocs'
  if (process.env.NODE_ENV !== "production") {
    url = 'http://127.0.0.1:8080/v1/apiDocs'
  }

  console.log(`getApiDefinition, url=${url}`)

  return axios.get(url)
}

export { getApiDefinition }
export default getClient
