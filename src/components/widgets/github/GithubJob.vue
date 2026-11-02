<template>
  <div>
    <v-alert
      v-if="error"
      type="error"
      dense
      text
      class="ma-4"
    >
      {{ error }}
    </v-alert>

    <template v-if="job">
      <v-card-text>
        <div class="text-h6">
          {{ choiceText }}
        </div>
        <div>
          {{ statusText }}
        </div>
        <v-progress-linear
          v-if="busy"
          indeterminate
          class="my-2"
        />
        <div
          v-if="job.message"
          class="github-job-message mt-2"
        >
          {{ job.message }}
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <app-btn
          v-if="finished"
          @click="$emit('slice-another')"
        >
          {{ $t('app.autoslice.btn.slice_another') }}
        </app-btn>
        <app-btn
          v-if="canPrint"
          color="primary"
          :disabled="printDisabled"
          @click="print"
        >
          <v-icon left>
            $printer
          </v-icon>
          {{ $t('app.general.btn.print') }}
        </app-btn>
      </v-card-actions>
    </template>

    <v-progress-linear
      v-else-if="!error"
      indeterminate
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import { SocketActions } from '@/api/socketActions'
import {
  agentErrorMessage,
  isWaitingForFile,
  jobChoiceText,
  jobStatus
} from '@/store/autoslice/helpers'
import type { AutosliceJobStatus } from '@/store/autoslice/types'

// Syncthing brings a finished gcode to the printer some seconds after the slice
const FILE_POLL_INTERVAL = 2000

@Component({})
export default class GithubJob extends Mixins(StateMixin) {
  @Prop({ type: String, required: true })
  readonly jobId!: string

  error: string | null = null
  fileReady = false
  checkingFile = false
  stopped = false
  pollTimeout: ReturnType<typeof setTimeout> | null = null

  get job (): Autoslice.Job | null {
    return this.$typedGetters['autoslice/getJob'](this.jobId)
  }

  get choiceText (): string {
    return this.job ? jobChoiceText(this.job) : ''
  }

  get status (): AutosliceJobStatus | null {
    return this.job ? jobStatus(this.job, this.fileReady) : null
  }

  get statusText (): string {
    return this.status ? this.$tc(`app.autoslice.status.${this.status}`) : ''
  }

  get waitingForFile (): boolean {
    return this.job !== null && isWaitingForFile(this.job, this.fileReady)
  }

  get finished (): boolean {
    return this.job?.state === 'done' || this.job?.state === 'error'
  }

  get busy (): boolean {
    return !this.finished || this.waitingForFile
  }

  get canPrint (): boolean {
    return this.job?.state === 'done' && this.fileReady
  }

  get printDisabled (): boolean {
    return this.printerPrinting || this.printerPaused || !this.klippyReady
  }

  @Watch('waitingForFile')
  onWaitingForFile () {
    this.checkFile()
  }

  checkFile () {
    if (this.checkingFile || !this.waitingForFile) {
      return
    }

    this.checkingFile = true
    this.requestMetadata()
  }

  // A rejection is expected while the file is still on its way, so ask again later
  async requestMetadata () {
    this.pollTimeout = null

    const path = this.job?.printer_path

    if (this.stopped || !path) {
      this.checkingFile = false
      return
    }

    try {
      await SocketActions.serverFilesMetadata(path, {
        dispatch: 'void',
        wait: undefined,
        suppressError: true
      })

      this.checkingFile = false
      this.fileReady = true
    } catch {
      if (!this.stopped) {
        this.pollTimeout = setTimeout(this.requestMetadata, FILE_POLL_INTERVAL)
      }
    }
  }

  async loadJob () {
    try {
      await this.$typedDispatch('autoslice/loadJob', this.jobId)
    } catch (error) {
      this.error = agentErrorMessage(error, this.$tc('app.autoslice.msg.not_connected'))
    }
  }

  print () {
    const path = this.job?.printer_path

    if (path) {
      SocketActions.printerPrintStart(path)

      this.$router.push({ name: 'home' })
    }
  }

  mounted () {
    this.loadJob()
    this.checkFile()
  }

  beforeDestroy () {
    this.stopped = true

    if (this.pollTimeout !== null) {
      clearTimeout(this.pollTimeout)
    }
  }
}
</script>

<style lang="scss" scoped>
  .github-job-message {
    white-space: pre-wrap;
  }
</style>
