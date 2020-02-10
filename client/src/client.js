import OpenAPIClientAxios from 'openapi-client-axios';
import { openApiData } from './Schema'
import axios from 'axios'

async function getClient(apiDefinition) {

    // FIXME do not hardcoded host
    const response = await axios.get('http://127.0.0.1:8080/v1/apiDocs');
    console.log(response.data);
    const api = new OpenAPIClientAxios({

      definition: response.data,
      axiosConfigDefaults: {
        // withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache',
          'Auth-Group': 'admin',
        },
      },
    });
    return api.init();
}

export default getClient
