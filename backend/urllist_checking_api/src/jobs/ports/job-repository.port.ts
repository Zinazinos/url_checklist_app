import type { JobEntity } from '../types/jobs.types';

export const JOB_REPOSITORY = Symbol('JOB_REPOSITORY');

export interface JobRepositoryPort {
  create(job: JobEntity): Promise<void>;
  list(): Promise<JobEntity[]>;
  getById(id: string): Promise<JobEntity | null>;
  update(job: JobEntity): Promise<void>;
  mutate(id: string, updater: (job: JobEntity) => void): Promise<JobEntity | null>;
}
