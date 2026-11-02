import {
  advanceJob,
  agentErrorMessage,
  initialSelection,
  isAgentAnsweredError,
  isChoiceSliced,
  isJobEvent,
  isOptionSliced,
  isRuleSliced,
  isWaitingForFile,
  jobChoiceText,
  jobStatus,
  modelKey,
  sliceArguments
} from '../helpers'
import type { AutosliceChoice } from '../types'

const NOT_CONNECTED = 'Slicer not connected'

const options = (
  overrides: Partial<Autoslice.OptionsResponse> = {}
): Autoslice.OptionsResponse => ({
  dimensions: [
    { name: 'material', options: ['PLA', 'PETG', 'TPU'], default: 'PLA' },
    { name: 'support', options: ['No support', 'Support'], default: 'No support' }
  ],
  rules: {
    'Vase PETG': { description: 'Spiral vase in PETG' }
  },
  matrix: true,
  ...overrides
})

const job = (overrides: Partial<Autoslice.Job> = {}): Autoslice.Job => ({
  id: 'j1',
  artifact_id: 42,
  model: 'parts/bracket.scad',
  selection: { material: 'PLA', support: 'No support' },
  rule: null,
  state: 'queued',
  message: '',
  path: null,
  printer_path: null,
  created_at: 1000,
  finished_at: null,
  ...overrides
})

const result = (
  selection: Autoslice.Selection | null,
  rule: string | null = null
): Autoslice.Result => ({
  selection,
  rule,
  path: 'out.gcode',
  printer_path: 'Sync/out.gcode'
})

const matrixChoice: AutosliceChoice = {
  selection: { material: 'PLA', support: 'No support' },
  rule: null
}

const ruleChoice: AutosliceChoice = { ...matrixChoice, rule: 'Vase PETG' }

const slicedCellChoice: AutosliceChoice = {
  selection: { material: 'PETG', support: 'No support' },
  rule: null
}

const results = [
  result({ material: 'PETG', support: 'No support' }),
  result(null, 'Vase PETG')
]

describe('modelKey', () => {
  it('joins the artifact id and the model path', () => {
    expect(modelKey(42, 'parts/bracket.scad')).toBe('42/parts/bracket.scad')
  })
})

describe('agentErrorMessage', () => {
  it.each([
    ['the agent is not connected', { code: 400, message: 'Agent autoslice not connected' }],
    ['the agent dropped the request', { code: 500, message: 'Client Socket Disconnected' }]
  ])('reads "Slicer not connected" when %s', (_, error) => {
    expect(agentErrorMessage(error, NOT_CONNECTED)).toBe(NOT_CONNECTED)
  })

  it('shows the message the agent answered', () => {
    const error = {
      code: 424,
      message: 'Agent autoslice RPC error',
      data: { code: -32000, message: 'unknown artifact 42' }
    }

    expect(agentErrorMessage(error, NOT_CONNECTED)).toBe('unknown artifact 42')
  })

  it.each([
    [{ code: 424, message: 'Agent autoslice RPC error' }, 'Agent autoslice RPC error'],
    [{ code: 424, message: 'Agent autoslice RPC error', data: 'x' }, 'Agent autoslice RPC error'],
    [{ code: 400, message: 'Agent other not connected' }, 'Agent other not connected'],
    [{ code: 500, message: 'Internal Server Error' }, 'Internal Server Error'],
    [{ code: 400, message: 'bad', data: { message: 'inner' } }, 'bad']
  ])('falls back to the outer message for %o', (error, expected) => {
    expect(agentErrorMessage(error, NOT_CONNECTED)).toBe(expected)
  })

  it('handles thrown Errors and unknown values', () => {
    expect(agentErrorMessage(new Error('Socket not ready'), NOT_CONNECTED)).toBe('Socket not ready')
    expect(agentErrorMessage('boom', NOT_CONNECTED)).toBe('boom')
  })
})

describe('isAgentAnsweredError', () => {
  it.each([
    [{ code: 424, message: 'Agent autoslice RPC error' }, true],
    [{ code: 400, message: 'Agent autoslice not connected' }, false],
    [new Error('Socket not ready'), false],
    [null, false]
  ])('tells %o apart', (error, expected) => {
    expect(isAgentAnsweredError(error)).toBe(expected)
  })
})

describe('initialSelection', () => {
  it('picks each dimension\'s default', () => {
    expect(initialSelection(options())).toEqual({ material: 'PLA', support: 'No support' })
  })

  it('is empty without dimensions', () => {
    expect(initialSelection(options({ dimensions: [] }))).toEqual({})
  })
})

describe('isOptionSliced', () => {
  it.each([
    ['material', 'PETG', true],
    ['material', 'PLA', false],
    ['material', 'TPU', false],
    ['support', 'Support', false]
  ])('marks %s %s as %s', (dimension, option, expected) => {
    expect(isOptionSliced(matrixChoice.selection, dimension, option, results)).toBe(expected)
  })

  it('compares against the other dimensions\' current options', () => {
    const selection = { material: 'PLA', support: 'Support' }

    expect(isOptionSliced(selection, 'material', 'PETG', results)).toBe(false)
  })

  it('does not match a cell with fewer dimensions', () => {
    const partial = [result({ material: 'PETG' })]

    expect(isOptionSliced(matrixChoice.selection, 'material', 'PETG', partial)).toBe(false)
  })
})

describe('isRuleSliced', () => {
  it.each([
    ['Vase PETG', true],
    ['Other', false]
  ])('marks %s as %s', (rule, expected) => {
    expect(isRuleSliced(rule, results)).toBe(expected)
  })
})

describe('isChoiceSliced', () => {
  it.each([
    ['a sliced rule', ruleChoice, options(), true],
    ['a rule not sliced', { ...matrixChoice, rule: 'Other' }, options(), false],
    ['a cell not sliced', matrixChoice, options(), false],
    ['a sliced cell', slicedCellChoice, options(), true],
    ['a sliced cell with the matrix off', slicedCellChoice, options({ matrix: false }), false]
  ])('is %s: %s', (_, choice, choiceOptions, expected) => {
    expect(isChoiceSliced(choice, choiceOptions, results)).toBe(expected)
  })
})

describe('sliceArguments', () => {
  it('slices the matrix cell', () => {
    expect(sliceArguments(42, 'a.scad', matrixChoice, options())).toEqual({
      artifact_id: 42,
      model: 'a.scad',
      selection: { material: 'PLA', support: 'No support' }
    })
  })

  it.each([true, false])('slices the picked rule with the matrix %s', matrix => {
    expect(sliceArguments(42, 'a.scad', ruleChoice, options({ matrix }))).toEqual({
      artifact_id: 42,
      model: 'a.scad',
      rule: 'Vase PETG'
    })
  })

  it('is null with the matrix off and no rule picked', () => {
    expect(sliceArguments(42, 'a.scad', matrixChoice, options({ matrix: false }))).toBeNull()
  })
})

describe('advanceJob', () => {
  it('takes the incoming job when none is known', () => {
    const incoming = job()

    expect(advanceJob(undefined, incoming)).toBe(incoming)
  })

  it.each<[Autoslice.JobState, Autoslice.JobState, 'current' | 'incoming']>([
    ['queued', 'slicing', 'incoming'],
    ['slicing', 'done', 'incoming'],
    ['slicing', 'error', 'incoming'],
    ['queued', 'queued', 'incoming'],
    ['slicing', 'queued', 'current'],
    ['done', 'slicing', 'current'],
    ['error', 'queued', 'current'],
    ['done', 'error', 'incoming']
  ])('from %s, given %s, keeps the %s job', (from, to, kept) => {
    const current = job({ state: from, message: 'current' })
    const incoming = job({ state: to, message: 'incoming' })

    expect(advanceJob(current, incoming).message).toBe(kept)
  })
})

describe('isJobEvent', () => {
  it('accepts a job event', () => {
    expect(isJobEvent({ agent: 'autoslice', event: 'autoslice.job', data: job() })).toBe(true)
  })

  it.each<Moonraker.Extensions.AgentEvent>([
    { agent: 'autoslice', event: 'disconnected' },
    { agent: 'autoslice', event: 'other', data: job() },
    { agent: 'autoslice', event: 'autoslice.job' },
    { agent: 'autoslice', event: 'autoslice.job', data: null },
    { agent: 'autoslice', event: 'autoslice.job', data: { ...job(), id: 5 } },
    { agent: 'autoslice', event: 'autoslice.job', data: { ...job(), state: 'paused' } }
  ])('rejects %o', event => {
    expect(isJobEvent(event)).toBe(false)
  })
})

describe('jobChoiceText', () => {
  it.each([
    [job({ rule: 'Vase PETG', selection: null }), 'Vase PETG'],
    [job(), 'PLA, No support'],
    [job({ selection: null }), '']
  ])('describes %o as "%s"', (value, expected) => {
    expect(jobChoiceText(value)).toBe(expected)
  })
})

describe('isWaitingForFile', () => {
  it.each([
    [job({ state: 'done', printer_path: 'Sync/a.gcode' }), false, true],
    [job({ state: 'done', printer_path: 'Sync/a.gcode' }), true, false],
    [job({ state: 'done', printer_path: null }), false, false],
    [job({ state: 'slicing', printer_path: 'Sync/a.gcode' }), false, false]
  ])('waits for %o with fileReady %s: %s', (value, fileReady, expected) => {
    expect(isWaitingForFile(value, fileReady)).toBe(expected)
  })
})

describe('jobStatus', () => {
  it.each<[Autoslice.JobState, boolean, string]>([
    ['queued', false, 'queued'],
    ['slicing', false, 'slicing'],
    ['error', false, 'error'],
    ['done', false, 'waiting_for_file'],
    ['done', true, 'ready']
  ])('reads %s with fileReady %s as %s', (state, fileReady, expected) => {
    expect(jobStatus(job({ state }), fileReady)).toBe(expected)
  })
})
