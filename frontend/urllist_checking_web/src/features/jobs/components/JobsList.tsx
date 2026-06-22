import { useJobsStore } from '../../../store/jobs.store'
import { StatusBadge } from './StatusBadge'

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString()
}

export function JobsList() {
  const jobs = useJobsStore((state) => state.jobs)
  const activeJobId = useJobsStore((state) => state.activeJobId)
  const isLoading = useJobsStore((state) => state.jobsLoading)
  const error = useJobsStore((state) => state.jobsError)
  const onRefresh = useJobsStore((state) => state.fetchJobs)
  const onSelect = useJobsStore((state) => state.setActiveJob)

  return (
    <section className="card">
      <div className="card-header">
        <h2>Задания</h2>
        <button type="button" className="secondary-btn" onClick={() => void onRefresh()}>
          Обновить
        </button>
      </div>

      {isLoading ? <p>Загрузка списка...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!isLoading && !jobs.length ? <p>Заданий пока нет.</p> : null}

      <ul className="jobs-list">
        {jobs.map((job) => (
          <li key={job.id}>
            <button
              type="button"
              className={`job-row ${activeJobId === job.id ? 'job-row-active' : ''}`}
              onClick={() => void onSelect(job.id)}
            >
              <div className="job-row-title">
                <strong>{job.id}</strong>
                <StatusBadge status={job.status} />
              </div>
              <p>Создано: {formatDate(job.createdAt)}</p>
              <p>
                Прогресс: {job.stats.processed} / {job.totalCount}, success: {job.stats.success},
                error: {job.stats.error}, cancelled: {job.stats.cancelled}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
