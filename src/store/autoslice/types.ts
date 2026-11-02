export interface AutosliceState {
  connected: boolean;
  projects: Autoslice.Project[] | null;
  models: Record<number, Autoslice.Model[]>;
  // Keyed by modelKey; '' marks a model the agent could not render
  thumbnails: Record<string, string>;
  options: Record<number, Autoslice.OptionsResponse>;
  // Keyed by modelKey
  results: Record<string, Autoslice.Result[]>;
  jobs: Record<string, Autoslice.Job>;
}

// The matrix cell picked in the options, and the rule that replaces it while one is picked
export interface AutosliceChoice {
  selection: Autoslice.Selection;
  rule: string | null;
}

export interface AutosliceModelRef {
  artifactId: number;
  model: string;
}

export type AutosliceJobStatus = 'queued' | 'slicing' | 'error' | 'waiting_for_file' | 'ready'
