import type { JobItemStatus, JobStatus } from '../../../types/jobs'

type StatusValue = JobStatus | JobItemStatus

interface StatusBadgeProps {
  status: StatusValue
}

const STATUS_LABELS: Record<StatusValue, string> = {
  pending: 'pending',
  in_progress: 'in progress',
  completed: 'completed',
  cancelled: 'cancelled',
  failed: 'failed',
  success: 'success',
  error: 'error',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]}</span>
}
