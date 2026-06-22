import { useEffect } from 'react'
import { ActiveJobPanel } from './features/jobs/components/ActiveJobPanel'
import { CreateJobForm } from './features/jobs/components/CreateJobForm'
import { JobsList } from './features/jobs/components/JobsList'
import { useJobsStore } from './store/jobs.store'
import './App.css'

function App() {
  useEffect(() => {
    const store = useJobsStore.getState()
    void store.fetchJobs()
    store.startJobsAutoRefresh()

    return () => {
      const currentStore = useJobsStore.getState()
      currentStore.stopJobsAutoRefresh()
      currentStore.stopPolling()
    }
  }, [])

  return (
    <main className="app-layout">
      <header>
        <h1>Async URL Checker</h1>
        <p className="subtitle">Запуск и мониторинг асинхронных задач проверки URL</p>
      </header>

      <CreateJobForm />

      <section className="grid-two-columns">
        <JobsList />
        <ActiveJobPanel />
      </section>
    </main>
  )
}

export default App
