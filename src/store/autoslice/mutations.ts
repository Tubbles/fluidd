import Vue from 'vue'
import type { MutationTree } from 'vuex'
import { createState } from './state'
import { advanceJob } from './helpers'
import type { AutosliceState } from './types'

export const mutations = {
  /**
   * Reset state
   */
  setReset (state) {
    Object.assign(state, createState())
  },

  setConnected (state, payload: boolean) {
    state.connected = payload
  },

  setProjects (state, payload: Autoslice.Project[]) {
    state.projects = payload
  },

  setModels (state, payload: { artifactId: number, models: Autoslice.Model[] }) {
    Vue.set(state.models, payload.artifactId, payload.models)
  },

  setThumbnail (state, payload: { key: string, png: string }) {
    Vue.set(state.thumbnails, payload.key, payload.png)
  },

  setOptions (state, payload: { artifactId: number, options: Autoslice.OptionsResponse }) {
    Vue.set(state.options, payload.artifactId, payload.options)
  },

  setResults (state, payload: { key: string, results: Autoslice.Result[] }) {
    Vue.set(state.results, payload.key, payload.results)
  },

  setJob (state, payload: Autoslice.Job) {
    Vue.set(state.jobs, payload.id, advanceJob(state.jobs[payload.id], payload))
  }
} satisfies MutationTree<AutosliceState>
