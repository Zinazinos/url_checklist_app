import type { JobSummary } from '../../../types/jobs'
import { StatusBadge } from './StatusBadge'

interface JobsListProps {
  jobs: JobSummary[]
  activeJobId: string | null
  isLoading: boolean
  error: string | null
  onRefresh: () => Promise<void>
  onSelect: (jobId: string) => Promise<void>
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString()
}

export function JobsList({
  jobs,
  activeJobId,
  isLoading,
  error,
  onRefresh,
  onSelect,
}: JobsListProps) {
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
