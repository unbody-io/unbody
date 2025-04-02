import axios, { AxiosInstance } from 'axios'

export interface Config {
  baseURL: string
}

export class BaseClient {
  private client: AxiosInstance

  constructor(config: Config) {
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  public async request<T>(
    method: string,
    url: string,
    data?: any,
    params?: Record<string, any>,
  ): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        params,
      })
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(
            'Could not connect to the Unbody server. Please make sure it is running.',
          )
        }
        throw new Error(
          `API request failed: ${error.response?.data?.message || error.message || error.code}`,
        )
      }
      throw error
    }
  }
}
