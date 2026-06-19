import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JOB_REPOSITORY } from '../ports/job-repository.port';
import type { JobRepositoryPort } from '../ports/job-repository.port';
import {
  buildJobStats,
} from '../types/jobs.types';
import type { JobDetailView, JobEntity, JobSummaryView } from '../types/jobs.types';
import { JobProcessorService } from './job-processor.service';

@Injectable()
export class JobsService {
  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly jobRepository: JobRepositoryPort,
    private readonly jobProcessor: JobProcessorService,
  ) {}

  async create(urls: string[]): Promise<{ jobId: string }> {
    const job: JobEntity = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      totalCount: urls.length,
      items: urls.map((url) => ({ url, status: 'pending' })),
    };

    await this.jobRepository.create(job);
    void this.jobProcessor.processJob(job.id);

    return { jobId: job.id };
  }

  async list(): Promise<JobSummaryView[]> {
    const jobs = await this.jobRepository.list();
    return jobs.map((job) => ({
      id: job.id,
      createdAt: job.createdAt,
      status: job.status,
      totalCount: job.totalCount,
      stats: buildJobStats(job.items),
    }));
  }

  async getById(id: string): Promise<JobDetailView> {
    const job = await this.jobRepository.getById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      createdAt: job.createdAt,
      status: job.status,
      totalCount: job.totalCount,
      stats: buildJobStats(job.items),
      items: job.items,
    };
  }

  async cancel(id: string): Promise<{ id: string; status: string }> {
    const existing = await this.jobRepository.getById(id);
    if (!existing) {
      throw new NotFoundException('Job not found');
    }

    if (existing.status === 'completed' || existing.status === 'failed') {
      return { id: existing.id, status: existing.status };
    }

    const updated = await this.jobRepository.mutate(id, (job) => {
      if (job.status === 'completed' || job.status === 'failed') {
        return;
      }

      job.status = 'cancelled';
      for (const item of job.items) {
        if (item.status === 'pending') {
          item.status = 'cancelled';
          item.finishedAt ??= new Date().toISOString();
          if (item.startedAt && item.finishedAt) {
            item.durationMs =
              new Date(item.finishedAt).getTime() -
              new Date(item.startedAt).getTime();
          }
        }
      }
    });

    if (!updated) {
      throw new NotFoundException('Job not found');
    }

    return { id: updated.id, status: updated.status };
  }
}
