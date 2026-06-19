import { apiRequest } from './client'
import type {
  CancelJobResponse,
  CreateJobRequest,
  CreateJobResponse,
  JobDetails,
  JobSummary,
} from '../types/jobs'

export const jobsApi = {
  createJob: (payload: CreateJobRequest) =>
    apiRequest<CreateJobResponse>('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getJobs: () => apiRequest<JobSummary[]>('/jobs'),

  getJobDetails: (jobId: string) => apiRequest<JobDetails>(`/jobs/${jobId}`),

  cancelJob: (jobId: string) =>
    apiRequest<CancelJobResponse>(`/jobs/${jobId}`, {
      method: 'DELETE',
    }),
}
