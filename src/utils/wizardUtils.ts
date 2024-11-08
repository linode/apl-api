import axios from 'axios'
import { OtomiError } from 'src/error'

const axiosInstance = (linodeApiToken) =>
  axios.create({
    baseURL: 'https://api.linode.com/v4',
    headers: {
      Authorization: `Bearer ${linodeApiToken}`,
      'Content-Type': 'application/json',
    },
  })

export const getClusterRegion = async (linodeApiToken, clusterId) => {
  try {
    const res = await axiosInstance(linodeApiToken).get(`/lke/clusters/${clusterId}`)
    return res.data.region
  } catch (err) {
    const error = new OtomiError(
      err.response.data.errors[0].reason ?? err.response.statusText ?? 'Error getting cluster region',
    )
    error.code = err.response.status ?? 500
    throw error
  }
}

export const createObjectStorageAccessKey = async (linodeApiToken, clusterId, region) => {
  const dateTime = new Date().toISOString().slice(0, 19).replace('T', '-')
  try {
    const res = await axiosInstance(linodeApiToken).post('/object-storage/keys', {
      label: `lke${clusterId}-key-${dateTime}`,
      regions: [region],
      permissions: 'read_write',
    })
    return res.data
  } catch (err) {
    const error = new OtomiError(
      err.response.data.errors[0].reason ?? err.response.statusText ?? 'Error creating object storage access key',
    )
    error.code = err.response.status ?? 500
    throw error
  }
}

export const createObjectStorageBucket = async (linodeApiToken, label, region) => {
  try {
    const res = await axiosInstance(linodeApiToken).post('/object-storage/buckets', {
      label,
      region,
    })
    return res.data
  } catch (err) {
    const error = new OtomiError(
      err.response.data.errors[0].reason ?? err.response.statusText ?? 'Error creating object storage bucket',
    )
    error.code = err.response.status ?? 500
    throw error
  }
}
