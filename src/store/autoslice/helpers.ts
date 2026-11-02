import { isSocketError, type SocketError } from '@/util/is-socket-error'
import type { AutosliceChoice, AutosliceJobStatus } from './types'

// An error the agent itself answered; Moonraker puts the agent's { code, message } in data
const AGENT_ANSWERED_ERROR_CODE = 424

// What Moonraker answers when the agent is not connected, or drops a request it was given
const NOT_CONNECTED_ERRORS: readonly SocketError[] = [
  { code: 400, message: 'Agent autoslice not connected' },
  { code: 500, message: 'Client Socket Disconnected' }
]

// Jobs only move forward: queued, slicing, then done or error
const JOB_STATE_RANKS: Record<Autoslice.JobState, number> = {
  queued: 0,
  slicing: 1,
  done: 2,
  error: 2
}

const JOB_STATES: readonly string[] = Object.keys(JOB_STATE_RANKS)

export const modelKey = (artifactId: number, model: string): string => `${artifactId}/${model}`

const isNotConnectedError = (error: SocketError): boolean => (
  NOT_CONNECTED_ERRORS
    .some(known => known.code === error.code && known.message === error.message)
)

export const isAgentAnsweredError = (error: unknown): boolean => (
  isSocketError(error) &&
  error.code === AGENT_ANSWERED_ERROR_CODE
)

const agentAnswerMessage = (error: SocketError): string | null => {
  const data = 'data' in error ? error.data : null

  if (
    error.code === AGENT_ANSWERED_ERROR_CODE &&
    data != null &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string' &&
    data.message !== ''
  ) {
    return data.message
  }

  return null
}

export const agentErrorMessage = (error: unknown, notConnectedText: string): string => {
  if (!isSocketError(error)) {
    return error instanceof Error
      ? error.message
      : String(error)
  }

  if (isNotConnectedError(error)) {
    return notConnectedText
  }

  return agentAnswerMessage(error) ?? error.message
}

export const initialSelection = (options: Autoslice.OptionsResponse): Autoslice.Selection => (
  Object.fromEntries(
    options.dimensions
      .map(dimension => [dimension.name, dimension.default])
  )
)

const sameSelection = (a: Autoslice.Selection, b: Autoslice.Selection): boolean => {
  const keys = Object.keys(a)

  return (
    keys.length === Object.keys(b).length &&
    keys.every(key => a[key] === b[key])
  )
}

const isSelectionSliced = (
  selection: Autoslice.Selection,
  results: Autoslice.Result[]
): boolean => (
  results
    .some(result => result.selection != null && sameSelection(result.selection, selection))
)

// Whether the cell of this option and the other dimensions' current options is sliced
export const isOptionSliced = (
  selection: Autoslice.Selection,
  dimension: string,
  option: string,
  results: Autoslice.Result[]
): boolean => (
  isSelectionSliced({ ...selection, [dimension]: option }, results)
)

export const isRuleSliced = (rule: string, results: Autoslice.Result[]): boolean => (
  results
    .some(result => result.rule === rule)
)

export const isChoiceSliced = (
  choice: AutosliceChoice,
  options: Autoslice.OptionsResponse,
  results: Autoslice.Result[]
): boolean => {
  if (choice.rule !== null) {
    return isRuleSliced(choice.rule, results)
  }

  return options.matrix && isSelectionSliced(choice.selection, results)
}

// Null while nothing can be sliced: the matrix is off and no rule is picked
export const sliceArguments = (
  artifactId: number,
  model: string,
  choice: AutosliceChoice,
  options: Autoslice.OptionsResponse
): Autoslice.SliceArguments | null => {
  if (choice.rule !== null) {
    return { artifact_id: artifactId, model, rule: choice.rule }
  }

  return options.matrix
    ? { artifact_id: artifactId, model, selection: { ...choice.selection } }
    : null
}

// Events and answers can cross, so keep the report that is further along
export const advanceJob = (
  current: Autoslice.Job | undefined,
  incoming: Autoslice.Job
): Autoslice.Job => (
  current && JOB_STATE_RANKS[incoming.state] < JOB_STATE_RANKS[current.state]
    ? current
    : incoming
)

// Checks the fields the store keys and ranks the job by
const isJob = (value: unknown): value is Autoslice.Job => (
  value != null &&
  typeof value === 'object' &&
  'id' in value && typeof value.id === 'string' &&
  'state' in value && typeof value.state === 'string' && JOB_STATES.includes(value.state)
)

export const isJobEvent = (
  event: Moonraker.Extensions.AgentEvent
): event is Autoslice.JobEvent => (
  event.event === 'autoslice.job' &&
  'data' in event &&
  isJob(event.data)
)

export const jobChoiceText = (job: Autoslice.Job): string => (
  job.rule ?? Object.values(job.selection ?? {}).join(', ')
)

// Whether a finished gcode is still on its way to the printer
export const isWaitingForFile = (job: Autoslice.Job, fileReady: boolean): boolean => (
  job.state === 'done' &&
  !!job.printer_path &&
  !fileReady
)

export const jobStatus = (job: Autoslice.Job, fileReady: boolean): AutosliceJobStatus => {
  switch (job.state) {
    case 'done':
      return fileReady ? 'ready' : 'waiting_for_file'
    default:
      return job.state
  }
}
