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

    <template v-if="options && choice">
      <template v-if="rules.length > 0">
        <v-subheader>
          {{ $t('app.autoslice.label.rules') }}
        </v-subheader>

        <v-list two-line>
          <v-list-item
            v-for="rule in rules"
            :key="`rule::${rule.name}`"
            :input-value="choice.rule === rule.name"
            color="primary"
            @click="pickRule(rule.name)"
          >
            <v-list-item-content>
              <v-list-item-title>
                {{ rule.name }}
                <v-icon
                  v-if="ruleSliced(rule.name)"
                  small
                  right
                >
                  $check
                </v-icon>
              </v-list-item-title>
              <v-list-item-subtitle>{{ rule.description }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </template>

      <v-card-text v-if="options.matrix">
        <v-row
          v-for="dimension in options.dimensions"
          :key="`dimension::${dimension.name}`"
          dense
          align="center"
        >
          <v-col
            cols="12"
            sm="2"
          >
            {{ $filters.prettyCase(dimension.name) }}
          </v-col>
          <v-col
            cols="12"
            sm="10"
          >
            <!-- Mandatory only on the matrix: with no value, Vuetify selects the first option -->
            <app-btn-toggle
              :value="activeOption(dimension.name)"
              :mandatory="choice.rule === null"
              dense
              @change="pickOption(dimension.name, $event)"
            >
              <app-btn
                v-for="option in dimension.options"
                :key="`option::${dimension.name}::${option}`"
                small
                :value="option"
              >
                {{ option }}
                <v-icon
                  v-if="optionSliced(dimension.name, option)"
                  small
                  right
                >
                  $check
                </v-icon>
              </app-btn>
            </app-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <app-btn
          color="primary"
          :disabled="!sliceRequest || slicing"
          :loading="slicing"
          @click="slice"
        >
          {{ choiceSliced ? $t('app.autoslice.btn.slice_again') : $t('app.autoslice.btn.slice') }}
        </app-btn>
      </v-card-actions>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel } from 'vue-property-decorator'
import StateMixin from '@/mixins/state'
import {
  agentErrorMessage,
  initialSelection,
  isChoiceSliced,
  isOptionSliced,
  isRuleSliced,
  sliceArguments
} from '@/store/autoslice/helpers'
import type { AutosliceChoice } from '@/store/autoslice/types'

@Component({})
export default class GithubOptions extends Mixins(StateMixin) {
  @Prop({ type: Number, required: true })
  readonly artifactId!: number

  @Prop({ type: String, required: true })
  readonly model!: string

  @VModel({ type: Object, default: null })
  choice!: AutosliceChoice | null

  error: string | null = null

  get options (): Autoslice.OptionsResponse | null {
    return this.$typedGetters['autoslice/getOptions'](this.artifactId)
  }

  get results (): Autoslice.Result[] {
    return this.$typedGetters['autoslice/getResults'](this.artifactId, this.model)
  }

  get rules (): { name: string, description: string }[] {
    return Object.entries(this.options?.rules ?? {})
      .map(([name, rule]) => ({ name, description: rule.description ?? '' }))
  }

  get loading (): boolean {
    return this.hasWait([this.$waits.onAutosliceOptions, this.$waits.onAutosliceSliced])
  }

  get slicing (): boolean {
    return this.hasWait(this.$waits.onAutosliceSlice)
  }

  get sliceRequest (): Autoslice.SliceArguments | null {
    return this.options && this.choice
      ? sliceArguments(this.artifactId, this.model, this.choice, this.options)
      : null
  }

  get choiceSliced (): boolean {
    return (
      this.options !== null &&
      this.choice !== null &&
      isChoiceSliced(this.choice, this.options, this.results)
    )
  }

  // No option is active while a rule is picked
  activeOption (dimension: string): string | undefined {
    if (this.choice === null || this.choice.rule !== null) {
      return undefined
    }

    return this.choice.selection[dimension]
  }

  ruleSliced (rule: string): boolean {
    return isRuleSliced(rule, this.results)
  }

  optionSliced (dimension: string, option: string): boolean {
    return (
      this.choice !== null &&
      isOptionSliced(this.choice.selection, dimension, option, this.results)
    )
  }

  // A rule replaces the matrix, which keeps its cell for when an option is picked again
  pickRule (rule: string) {
    if (this.choice) {
      this.choice = { ...this.choice, rule }
    }
  }

  // Picking an option returns to the matrix
  pickOption (dimension: string, option: unknown) {
    if (this.choice && typeof option === 'string') {
      this.choice = {
        selection: { ...this.choice.selection, [dimension]: option },
        rule: null
      }
    }
  }

  async slice () {
    const args = this.sliceRequest

    if (!args) {
      return
    }

    this.error = null

    try {
      const job = await this.$typedDispatch('autoslice/slice', args)

      this.$emit('job', job.id)
    } catch (error) {
      this.showError(error)
    }
  }

  async load () {
    this.error = null

    try {
      if (this.options === null) {
        await this.$typedDispatch('autoslice/loadOptions', this.artifactId)
      }

      if (this.choice === null && this.options !== null) {
        this.choice = { selection: initialSelection(this.options), rule: null }
      }

      await this.$typedDispatch('autoslice/loadSliced', {
        artifactId: this.artifactId,
        model: this.model
      })
    } catch (error) {
      this.showError(error)
    }
  }

  showError (error: unknown) {
    this.error = agentErrorMessage(error, this.$tc('app.autoslice.msg.not_connected'))
  }

  mounted () {
    this.load()
  }
}
</script>
