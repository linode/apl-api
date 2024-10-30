import axios from 'axios'

const axiosInstance = (linodeApiToken) =>
  axios.create({
    baseURL: 'https://api.linode.com/v4',
    headers: {
      Authorization: `Bearer ${linodeApiToken}`,
      'Content-Type': 'application/json',
    },
  })

export const getClusterRegion = async (linodeApiToken, clusterId) => {
  const res = await axiosInstance(linodeApiToken).get(`/lke/clusters/${clusterId}`)
  return res.data.region
}

export const createObjectStorageAccessKey = async (linodeApiToken, region) => {
  const dateTime = new Date().toISOString().slice(0, 19).replace('T', '-')
  const res = await axiosInstance(linodeApiToken).post('/object-storage/keys', {
    label: `wizard-key-${dateTime}`,
    region,
    permissions: 'read_write',
  })
  return res.data
}

export const createObjectStorageBucket = async (linodeApiToken, label, region) => {
  const res = await axiosInstance(linodeApiToken).post('/object-storage/buckets', {
    label,
    region,
  })
  return res.data
}
