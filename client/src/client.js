import OpenAPIClientAxios from 'openapi-client-axios';
import { openApiData } from './Schema'
import axios from 'axios'

async function getClient() {
  try {
    // FIXME do not hardcode host
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
    return await api.init();

  } catch (error) {
    console.error(error);
    return null
  }
}

export default getClient
