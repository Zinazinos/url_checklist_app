import { Injectable } from '@nestjs/common';
import type { JobRepositoryPort } from '../ports/job-repository.port';
import type { JobEntity } from '../types/jobs.types';

@Injectable()
export class InMemoryJobRepository implements JobRepositoryPort {
  private readonly jobs = new Map<string, JobEntity>();

  async create(job: JobEntity): Promise<void> {
    this.jobs.set(job.id, this.clone(job));
  }

  async list(): Promise<JobEntity[]> {
    return Array.from(this.jobs.values()).map((job) => this.clone(job));
  }

  async getById(id: string): Promise<JobEntity | null> {
    const job = this.jobs.get(id);
    return job ? this.clone(job) : null;
  }

  async update(job: JobEntity): Promise<void> {
    this.jobs.set(job.id, this.clone(job));
  }

  async mutate(
    id: string,
    updater: (job: JobEntity) => void,
  ): Promise<JobEntity | null> {
    const current = this.jobs.get(id);
    if (!current) {
      return null;
    }

    const next = this.clone(current);
    updater(next);
    this.jobs.set(id, this.clone(next));

    return this.clone(next);
  }

  private clone(job: JobEntity): JobEntity {
    return JSON.parse(JSON.stringify(job)) as JobEntity;
  }
}
