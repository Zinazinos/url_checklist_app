import { useEffect } from 'react'
import { ActiveJobPanel } from './features/jobs/components/ActiveJobPanel'
import { CreateJobForm } from './features/jobs/components/CreateJobForm'
import { JobsList } from './features/jobs/components/JobsList'
import { useJobsStore } from './store/jobs.store'
import './App.css'

function App() {
  const jobs = useJobsStore((state) => state.jobs)
  const jobsLoading = useJobsStore((state) => state.jobsLoading)
  const jobsError = useJobsStore((state) => state.jobsError)
  const activeJobId = useJobsStore((state) => state.activeJobId)
  const activeJob = useJobsStore((state) => state.activeJob)
  const activeJobLoading = useJobsStore((state) => state.activeJobLoading)
  const activeJobError = useJobsStore((state) => state.activeJobError)
  const createJobLoading = useJobsStore((state) => state.createJobLoading)
  const createJobError = useJobsStore((state) => state.createJobError)
  const cancelJobLoading = useJobsStore((state) => state.cancelJobLoading)

  const fetchJobs = useJobsStore((state) => state.fetchJobs)
  const startJobsAutoRefresh = useJobsStore((state) => state.startJobsAutoRefresh)
  const stopJobsAutoRefresh = useJobsStore((state) => state.stopJobsAutoRefresh)
  const createJobFromInput = useJobsStore((state) => state.createJobFromInput)
  const setActiveJob = useJobsStore((state) => state.setActiveJob)
  const stopPolling = useJobsStore((state) => state.stopPolling)
  const cancelActiveJob = useJobsStore((state) => state.cancelActiveJob)

  useEffect(() => {
    void fetchJobs()
    startJobsAutoRefresh()

    return () => {
      stopJobsAutoRefresh()
      stopPolling()
    }
  }, [fetchJobs, startJobsAutoRefresh, stopJobsAutoRefresh, stopPolling])

  return (
    <main className="app-layout">
      <header>
        <h1>Async URL Checker</h1>
        <p className="subtitle">Запуск и мониторинг асинхронных задач проверки URL</p>
      </header>

      <CreateJobForm
        isSubmitting={createJobLoading}
        error={createJobError}
        onSubmit={createJobFromInput}
      />

      <section className="grid-two-columns">
        <JobsList
          jobs={jobs}
          activeJobId={activeJobId}
          isLoading={jobsLoading}
          error={jobsError}
          onRefresh={fetchJobs}
          onSelect={setActiveJob}
        />
        <ActiveJobPanel
          activeJob={activeJob}
          isLoading={activeJobLoading}
          error={activeJobError}
          isCancelling={cancelJobLoading}
          onCancel={cancelActiveJob}
        />
      </section>
    </main>
  )
}

export default App
