import type { JobDetails } from '../../../types/jobs'
import { StatusBadge } from './StatusBadge'

interface ActiveJobPanelProps {
  activeJob: JobDetails | null
  isLoading: boolean
  error: string | null
  isCancelling: boolean
  onCancel: () => Promise<void>
}

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'failed'])

function formatDate(isoDate?: string): string {
  if (!isoDate) {
    return '-'
  }
  return new Date(isoDate).toLocaleString()
}

export function ActiveJobPanel({
  activeJob,
  isLoading,
  error,
  isCancelling,
  onCancel,
}: ActiveJobPanelProps) {
  if (!activeJob) {
    return (
      <section className="card">
        <h2>Детали задания</h2>
        <p>Выберите задание из списка слева.</p>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Детали задания</h2>
        <button
          type="button"
          className="danger-btn"
          onClick={() => void onCancel()}
          disabled={isCancelling || TERMINAL_STATUSES.has(activeJob.status)}
        >
          {isCancelling ? 'Отмена...' : 'Отменить задание'}
        </button>
      </div>

      <div className="active-job-summary">
        <p>
          <strong>ID:</strong> {activeJob.id}
        </p>
        <p>
          <strong>Создано:</strong> {formatDate(activeJob.createdAt)}
        </p>
        <p>
          <strong>Статус:</strong> <StatusBadge status={activeJob.status} />
        </p>
        <p>
          <strong>Прогресс:</strong> {activeJob.stats.processed} из {activeJob.totalCount} обработано
        </p>
      </div>

      {isLoading ? <p>Обновляем данные активного задания...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="items-table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Статус</th>
              <th>HTTP</th>
              <th>Ошибка</th>
              <th>Начато</th>
              <th>Завершено</th>
              <th>Длительность (мс)</th>
            </tr>
          </thead>
          <tbody>
            {activeJob.items.map((item, index) => (
              <tr key={`${activeJob.id}-${item.url}-${index}`}>
                <td>{item.url}</td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>{item.httpStatus ?? '-'}</td>
                <td>{item.errorMessage ?? '-'}</td>
                <td>{formatDate(item.startedAt)}</td>
                <td>{formatDate(item.finishedAt)}</td>
                <td>{item.durationMs ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
