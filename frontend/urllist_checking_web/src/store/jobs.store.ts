import { create } from 'zustand'
import { jobsApi } from '../api/jobs.api'
import { ApiRequestError } from '../api/client'
import { normalizeUrls } from '../features/jobs/utils/normalizeUrls'
import type { JobDetails, JobSummary } from '../types/jobs'

const TERMINAL_JOB_STATUSES = new Set(['completed', 'cancelled', 'failed'])
const JOBS_REFRESH_INTERVAL_MS = 8000
const POLLING_INTERVAL_MS = 1500

interface JobsState {
  jobs: JobSummary[]
  jobsLoading: boolean
  jobsError: string | null
  createJobLoading: boolean
  createJobError: string | null
  activeJobId: string | null
  activeJob: JobDetails | null
  activeJobLoading: boolean
  activeJobError: string | null
  cancelJobLoading: boolean
  pollingSessionId: number
  activeJobRequestId: number
  pollingTimer: ReturnType<typeof setTimeout> | null
  jobsRefreshTimer: ReturnType<typeof setInterval> | null
  fetchJobs: () => Promise<void>
  startJobsAutoRefresh: () => void
  stopJobsAutoRefresh: () => void
  createJobFromInput: (input: string) => Promise<void>
  setActiveJob: (jobId: string) => Promise<void>
  pollActiveJob: () => void
  stopPolling: () => void
  cancelActiveJob: () => Promise<void>
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Неизвестная ошибка'
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  jobsLoading: false,
  jobsError: null,
  createJobLoading: false,
  createJobError: null,
  activeJobId: null,
  activeJob: null,
  activeJobLoading: false,
  activeJobError: null,
  cancelJobLoading: false,
  pollingSessionId: 0,
  activeJobRequestId: 0,
  pollingTimer: null,
  jobsRefreshTimer: null,

  fetchJobs: async () => {
    set({ jobsLoading: true, jobsError: null })
    try {
      const jobs = await jobsApi.getJobs()
      set({ jobs, jobsLoading: false })
    } catch (error) {
      set({
        jobsLoading: false,
        jobsError: extractErrorMessage(error),
      })
    }
  },

  startJobsAutoRefresh: () => {
    const { jobsRefreshTimer } = get()
    if (jobsRefreshTimer) {
      return
    }

    const timer = setInterval(() => {
      void get().fetchJobs()
    }, JOBS_REFRESH_INTERVAL_MS)

    set({ jobsRefreshTimer: timer })
  },

  stopJobsAutoRefresh: () => {
    const { jobsRefreshTimer } = get()
    if (jobsRefreshTimer) {
      clearInterval(jobsRefreshTimer)
      set({ jobsRefreshTimer: null })
    }
  },

  createJobFromInput: async (input: string) => {
    const urls = normalizeUrls(input)
    if (!urls.length) {
      set({ createJobError: 'Добавьте хотя бы один URL', createJobLoading: false })
      return
    }

    set({ createJobLoading: true, createJobError: null })
    try {
      const response = await jobsApi.createJob({ urls })
      set({ createJobLoading: false })
      await get().fetchJobs()
      await get().setActiveJob(response.jobId)
    } catch (error) {
      set({
        createJobLoading: false,
        createJobError: extractErrorMessage(error),
      })
    }
  },

  setActiveJob: async (jobId: string) => {
    get().stopPolling()
    const nextRequestId = get().activeJobRequestId + 1
    set({
      activeJobId: jobId,
      activeJob: null,
      activeJobLoading: true,
      activeJobError: null,
      activeJobRequestId: nextRequestId,
    })

    try {
      const details = await jobsApi.getJobDetails(jobId)
      const state = get()
      if (state.activeJobId !== jobId || state.activeJobRequestId !== nextRequestId) {
        return
      }

      set({ activeJob: details, activeJobLoading: false })
      if (!TERMINAL_JOB_STATUSES.has(details.status)) {
        get().pollActiveJob()
      }
    } catch (error) {
      const state = get()
      if (state.activeJobId !== jobId || state.activeJobRequestId !== nextRequestId) {
        return
      }

      set({
        activeJobLoading: false,
        activeJobError: extractErrorMessage(error),
      })
    }
  },

  pollActiveJob: () => {
    const { activeJobId, pollingTimer, pollingSessionId } = get()
    if (!activeJobId) {
      return
    }

    if (pollingTimer) {
      clearTimeout(pollingTimer)
    }

    const nextSessionId = pollingSessionId + 1
    set({ pollingSessionId: nextSessionId, pollingTimer: null })

    const poll = async () => {
      try {
        const details = await jobsApi.getJobDetails(activeJobId)
        const state = get()
        if (state.pollingSessionId !== nextSessionId || state.activeJobId !== activeJobId) {
          return
        }

        set({
          activeJob: details,
          activeJobLoading: false,
          activeJobError: null,
        })

        if (TERMINAL_JOB_STATUSES.has(details.status)) {
          set({ pollingTimer: null })
          void get().fetchJobs()
          return
        }

        const timer = setTimeout(() => {
          void poll()
        }, POLLING_INTERVAL_MS)

        set({ pollingTimer: timer })
      } catch (error) {
        const state = get()
        if (state.pollingSessionId !== nextSessionId || state.activeJobId !== activeJobId) {
          return
        }

        set({
          activeJobError: extractErrorMessage(error),
          activeJobLoading: false,
        })

        const timer = setTimeout(() => {
          void poll()
        }, POLLING_INTERVAL_MS)
        set({ pollingTimer: timer })
      }
    }

    void poll()
  },

  stopPolling: () => {
    const { pollingTimer, pollingSessionId } = get()
    if (pollingTimer) {
      clearTimeout(pollingTimer)
    }
    // Invalidate every in-flight poll response from previous session.
    set({ pollingTimer: null, pollingSessionId: pollingSessionId + 1 })
  },

  cancelActiveJob: async () => {
    const { activeJobId } = get()
    if (!activeJobId) {
      return
    }

    set({ cancelJobLoading: true, activeJobError: null })
    try {
      await jobsApi.cancelJob(activeJobId)
      set({ cancelJobLoading: false })
      await get().setActiveJob(activeJobId)
      await get().fetchJobs()
    } catch (error) {
      set({
        cancelJobLoading: false,
        activeJobError: extractErrorMessage(error),
      })
    }
  },
}))
