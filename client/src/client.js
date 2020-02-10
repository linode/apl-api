import OpenAPIClientAxios from 'openapi-client-axios';


function getClient(apiDefinition) {
    const api = new OpenAPIClientAxios({

      definition: apiDefinition,
      axiosConfigDefaults: {
        // withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache',
          'Auth-Group': 'admin',
        },
      },
    });
    return api.initSync();
}

export default getClient
