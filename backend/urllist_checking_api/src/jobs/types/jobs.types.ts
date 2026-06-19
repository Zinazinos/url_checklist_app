export type JobStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type JobItemStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'error'
  | 'cancelled';

export interface JobItem {
  url: string;
  status: JobItemStatus;
  httpStatus?: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface JobEntity {
  id: string;
  createdAt: string;
  status: JobStatus;
  totalCount: number;
  items: JobItem[];
}

export interface JobStats {
  success: number;
  error: number;
  cancelled: number;
  processed: number;
}

export interface JobSummaryView {
  id: string;
  createdAt: string;
  status: JobStatus;
  totalCount: number;
  stats: JobStats;
}

export interface JobDetailView extends JobSummaryView {
  items: JobItem[];
}

export function buildJobStats(items: JobItem[]): JobStats {
  const success = items.filter((item) => item.status === 'success').length;
  const error = items.filter((item) => item.status === 'error').length;
  const cancelled = items.filter((item) => item.status === 'cancelled').length;

  return {
    success,
    error,
    cancelled,
    processed: success + error + cancelled,
  };
}
