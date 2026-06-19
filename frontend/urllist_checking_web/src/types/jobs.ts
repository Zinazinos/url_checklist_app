export type JobStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed'

export type JobItemStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'error'
  | 'cancelled'

export interface JobStats {
  success: number
  error: number
  cancelled: number
  processed: number
}

export interface JobSummary {
  id: string
  createdAt: string
  status: JobStatus
  totalCount: number
  stats: JobStats
}

export interface JobItem {
  url: string
  status: JobItemStatus
  httpStatus?: number
  errorMessage?: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
}

export interface JobDetails extends JobSummary {
  items: JobItem[]
}

export interface CreateJobRequest {
  urls: string[]
}

export interface CreateJobResponse {
  jobId: string
}

export interface CancelJobResponse {
  id: string
  status: 'cancelled'
}

export interface ApiErrorResponse {
  statusCode?: number
  message?: string | string[]
  error?: string
}
