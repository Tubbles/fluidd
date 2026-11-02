<template>
  <collapsable-card
    :title="$t('app.general.title.github')"
    icon="$github"
    :collapsable="false"
    :sub-title="subTitle"
  >
    <template #menu>
      <app-btn
        v-if="view !== 'projects'"
        small
        class="me-1 my-1"
        @click="back"
      >
        <v-icon
          small
          left
        >
          $left
        </v-icon>
        <span>{{ $t('app.autoslice.btn.back') }}</span>
      </app-btn>

      <app-btn
        v-else
        small
        class="me-1 my-1"
        :disabled="!connected"
        :loading="loadingProjects"
        @click="refresh"
      >
        <v-icon
          small
          left
        >
          $refresh
        </v-icon>
        <span>{{ $t('app.general.btn.refresh') }}</span>
      </app-btn>
    </template>

    <v-card-text v-if="!connected">
      {{ $t('app.autoslice.msg.not_connected') }}
    </v-card-text>

    <github-projects
      v-else-if="view === 'projects'"
      ref="projects"
      @open="openProject"
    />

    <github-models
      v-else-if="view === 'models' && project"
      :artifact-id="project.artifact_id"
      @open="openModel"
    />

    <github-options
      v-else-if="view === 'options' && project && model"
      v-model="choice"
      :artifact-id="project.artifact_id"
      :model="model"
      @job="openJob"
    />

    <github-job
      v-else-if="view === 'job' && jobId"
      :job-id="jobId"
      @slice-another="back"
    />
  </collapsable-card>
</template>

<script lang="ts">
import { Component, Mixins, Ref } from 'vue-property-decorator'
import { escape } from 'lodash-es'
import StateMixin from '@/mixins/state'
import GithubProjects from './GithubProjects.vue'
import GithubModels from './GithubModels.vue'
import GithubOptions from './GithubOptions.vue'
import GithubJob from './GithubJob.vue'
import type { AutosliceChoice } from '@/store/autoslice/types'

type GithubView = 'projects' | 'models' | 'options' | 'job'

@Component({
  components: {
    GithubProjects,
    GithubModels,
    GithubOptions,
    GithubJob
  }
})
export default class GithubCard extends Mixins(StateMixin) {
  @Ref('projects')
  readonly projectsView?: GithubProjects

  view: GithubView = 'projects'
  project: Autoslice.Project | null = null
  model: string | null = null
  choice: AutosliceChoice | null = null
  jobId: string | null = null

  get connected (): boolean {
    return this.$typedState.autoslice.connected
  }

  get loadingProjects (): boolean {
    return this.hasWait(this.$waits.onAutosliceProjects)
  }

  // The card renders its sub-title as HTML
  get subTitle (): string | undefined {
    const detail = this.view === 'models'
      ? this.project?.name
      : this.model

    return this.connected && detail
      ? escape(detail)
      : undefined
  }

  openProject (project: Autoslice.Project) {
    this.project = project
    this.view = 'models'
  }

  openModel (model: string) {
    this.model = model
    this.choice = null
    this.view = 'options'
  }

  openJob (id: string) {
    this.jobId = id
    this.view = 'job'
  }

  back () {
    switch (this.view) {
      case 'models':
        this.project = null
        this.view = 'projects'
        break
      case 'options':
        this.model = null
        this.view = 'models'
        break
      case 'job':
        this.jobId = null
        this.view = 'options'
        break
    }
  }

  refresh () {
    this.projectsView?.load()
  }
}
</script>
