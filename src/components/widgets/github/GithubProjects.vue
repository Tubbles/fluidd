<template>
  <div>
    <v-progress-linear
      v-if="loading"
      indeterminate
    />

    <v-alert
      v-if="error"
      type="error"
      dense
      text
      class="ma-4"
    >
      {{ error }}
    </v-alert>

    <v-list
      v-if="projects && projects.length > 0"
      two-line
    >
      <v-list-item
        v-for="project in projects"
        :key="`project::${project.artifact_id}`"
        @click="$emit('open', project)"
      >
        <v-list-item-content>
          <v-list-item-title>{{ project.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ projectDetail(project) }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>

    <v-card-text v-else-if="projects">
      {{ $t('app.autoslice.label.no_projects') }}
    </v-card-text>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import { agentErrorMessage } from '@/store/autoslice/helpers'

@Component({})
export default class GithubProjects extends Mixins(StateMixin) {
  error: string | null = null

  get projects (): Autoslice.Project[] | null {
    return this.$typedState.autoslice.projects
  }

  get loading (): boolean {
    return this.hasWait(this.$waits.onAutosliceProjects)
  }

  projectDetail (project: Autoslice.Project): string {
    return [
      project.commit.slice(0, 7),
      this.$filters.formatRelativeTimeToNow(project.created_at),
      this.$filters.getReadableFileSizeString(project.size)
    ].join(' · ')
  }

  async load () {
    this.error = null

    try {
      await this.$typedDispatch('autoslice/loadProjects')
    } catch (error) {
      this.error = agentErrorMessage(error, this.$tc('app.autoslice.msg.not_connected'))
    }
  }

  mounted () {
    if (this.projects === null) {
      this.load()
    }
  }
}
</script>
