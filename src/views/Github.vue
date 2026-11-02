<template>
  <v-row :dense="$vuetify.breakpoint.smAndDown">
    <v-col cols="12">
      <github-card />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import GithubCard from '@/components/widgets/github/GithubCard.vue'

@Component({
  components: {
    GithubCard
  }
})
export default class Github extends Vue {
}
</script>
