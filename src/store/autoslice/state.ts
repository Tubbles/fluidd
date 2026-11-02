import type { AutosliceState } from './types'

export const createState = (): AutosliceState => {
  return {
    connected: false,
    projects: null,
    models: {},
    thumbnails: {},
    options: {},
    results: {},
    jobs: {}
  }
}
