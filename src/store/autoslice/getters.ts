import type { GetterTree } from 'vuex'
import type { AutosliceState } from './types'
import type { RootState } from '../types'
import { modelKey } from './helpers'

export const getters = {
  getModels: (state) => (artifactId: number): Autoslice.Model[] | null => {
    return state.models[artifactId] ?? null
  },

  getOptions: (state) => (artifactId: number): Autoslice.OptionsResponse | null => {
    return state.options[artifactId] ?? null
  },

  /**
   * undefined while not loaded, '' when the agent could not render the model
   */
  getThumbnail: (state) => (artifactId: number, model: string): string | undefined => {
    return state.thumbnails[modelKey(artifactId, model)]
  },

  getResults: (state) => (artifactId: number, model: string): Autoslice.Result[] => {
    return state.results[modelKey(artifactId, model)] ?? []
  },

  getJob: (state) => (id: string): Autoslice.Job | null => {
    return state.jobs[id] ?? null
  }
} satisfies GetterTree<AutosliceState, RootState>
