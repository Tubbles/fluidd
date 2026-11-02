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
      v-if="models && models.length > 0"
      two-line
    >
      <v-list-item
        v-for="model in models"
        :key="`model::${model.name}`"
        @click="$emit('open', model.name)"
      >
        <v-list-item-avatar
          tile
          size="48"
        >
          <v-img
            v-if="thumbnail(model.name)"
            :src="'data:image/png;base64,' + thumbnail(model.name)"
            contain
          />
          <v-icon v-else>
            $file
          </v-icon>
        </v-list-item-avatar>

        <v-list-item-content>
          <v-list-item-title>{{ model.name }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ $filters.getReadableFileSizeString(model.size) }}
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>

    <v-card-text v-else-if="models">
      {{ $t('app.autoslice.label.no_models') }}
    </v-card-text>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { consola } from 'consola'
import StateMixin from '@/mixins/state'
import { agentErrorMessage } from '@/store/autoslice/helpers'

@Component({})
export default class GithubModels extends Mixins(StateMixin) {
  @Prop({ type: Number, required: true })
  readonly artifactId!: number

  error: string | null = null
  stopped = false

  get models (): Autoslice.Model[] | null {
    return this.$typedGetters['autoslice/getModels'](this.artifactId)
  }

  get loading (): boolean {
    return this.hasWait(this.$waits.onAutosliceModels)
  }

  thumbnail (model: string): string | undefined {
    return this.$typedGetters['autoslice/getThumbnail'](this.artifactId, model)
  }

  async load () {
    this.error = null

    try {
      if (this.models === null) {
        await this.$typedDispatch('autoslice/loadModels', this.artifactId)
      }

      await this.loadThumbnails()
    } catch (error) {
      this.error = agentErrorMessage(error, this.$tc('app.autoslice.msg.not_connected'))
    }
  }

  // The agent renders a thumbnail on its first request, which takes seconds, so one at a time
  async loadThumbnails () {
    for (const model of this.models ?? []) {
      if (this.stopped) {
        return
      }

      if (this.thumbnail(model.name) === undefined) {
        await this.loadThumbnail(model.name)
      }
    }
  }

  async loadThumbnail (model: string) {
    try {
      await this.$typedDispatch('autoslice/loadThumbnail', { artifactId: this.artifactId, model })
    } catch (error) {
      consola.debug('[Autoslice] no thumbnail for', model, error)
    }
  }

  mounted () {
    this.load()
  }

  beforeDestroy () {
    this.stopped = true
  }
}
</script>
