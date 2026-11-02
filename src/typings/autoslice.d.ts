declare namespace Autoslice {
  export interface Project {
    repo: string;
    artifact_id: number;
    name: string;
    commit: string;
    created_at: string;
    size: number;
  }

  export interface Model {
    name: string;
    size: number;
  }

  export interface Dimension {
    name: string;
    options: string[];
    default: string;
  }

  export interface Rule {
    description?: string;
    settings?: Record<string, string>;
  }

  export interface OptionsResponse {
    dimensions: Dimension[];
    rules: Record<string, Rule>;
    matrix: boolean;
  }

  export type Selection = Record<string, string>

  export interface Result {
    selection: Selection | null;
    rule: string | null;
    path: string;
    printer_path: string;
  }

  export type JobState = 'queued' | 'slicing' | 'done' | 'error'

  export interface Job {
    id: string;
    artifact_id: number;
    model: string;
    selection: Selection | null;
    rule: string | null;
    state: JobState;
    message: string;
    path: string | null;
    printer_path: string | null;
    created_at: number;
    finished_at: number | null;
  }

  export interface ThumbnailResponse {
    png: string;
  }

  export type SliceArguments =
    | { artifact_id: number; model: string; selection: Selection }
    | { artifact_id: number; model: string; rule: string }

  export interface JobEvent {
    agent: string;
    event: 'autoslice.job';
    data: Job;
  }
}
