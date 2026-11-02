import type { ActionTree } from 'vuex'
import type { AutosliceModelRef, AutosliceState } from './types'
import type { RootState } from '../types'
import { SocketActions } from '@/api/socketActions'
import { isAgentAnsweredError, isJobEvent, modelKey } from './helpers'

const isAgentConnectedEvent = (
  event: Moonraker.Extensions.AgentEvent
): event is Moonraker.Extensions.AgentConnectedEvent => (
  event.event === 'connected'
)

const isAgentDisconnectedEvent = (
  event: Moonraker.Extensions.AgentEvent
): event is Moonraker.Extensions.AgentDisconnectedEvent => (
  event.event === 'disconnected'
)

export const actions = {
  /**
   * Reset our store
   */
  async reset ({ commit }) {
    commit('setReset')
  },

  async onAgentEvent ({ commit }, payload: Moonraker.Extensions.AgentEvent) {
    if (isAgentConnectedEvent(payload)) {
      commit('setConnected', true)
    } else if (isAgentDisconnectedEvent(payload)) {
      // Also drops every cache
      commit('setReset')
    } else if (isJobEvent(payload)) {
      commit('setJob', payload.data)
    }
  },

  async loadProjects ({ commit }) {
    const projects = await SocketActions.autosliceProjects()

    commit('setProjects', projects)
  },

  async loadModels ({ commit }, artifactId: number) {
    const models = await SocketActions.autosliceModels(artifactId)

    commit('setModels', { artifactId, models })
  },

  /**
   * A model the agent could not render is stored as '', so it is not asked for again
   */
  async loadThumbnail ({ commit }, payload: AutosliceModelRef) {
    const key = modelKey(payload.artifactId, payload.model)

    try {
      const { png } = await SocketActions.autosliceThumbnail(payload.artifactId, payload.model)

      commit('setThumbnail', { key, png })
    } catch (error) {
      if (!isAgentAnsweredError(error)) {
        throw error
      }

      commit('setThumbnail', { key, png: '' })
    }
  },

  async loadOptions ({ commit }, artifactId: number) {
    const options = await SocketActions.autosliceOptions(artifactId)

    commit('setOptions', { artifactId, options })
  },

  async loadSliced ({ commit }, payload: AutosliceModelRef) {
    const key = modelKey(payload.artifactId, payload.model)

    try {
      const results = await SocketActions.autosliceSliced(payload.artifactId, payload.model)

      commit('setResults', { key, results })
    } catch (error) {
      commit('setResults', { key, results: [] })

      throw error
    }
  },

  async slice ({ commit }, payload: Autoslice.SliceArguments) {
    const job = await SocketActions.autosliceSlice(payload)

    commit('setJob', job)

    return job
  },

  async loadJob ({ commit }, id: string) {
    const job = await SocketActions.autosliceJob(id)

    commit('setJob', job)
  }
} satisfies ActionTree<AutosliceState, RootState>
