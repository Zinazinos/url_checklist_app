import { Inject, Injectable, Logger } from '@nestjs/common';
import { JOB_REPOSITORY } from '../ports/job-repository.port';
import type { JobRepositoryPort } from '../ports/job-repository.port';
import { URL_PROBE } from '../ports/url-probe.port';
import type { UrlProbePort } from '../ports/url-probe.port';
import type { JobItem } from '../types/jobs.types';

@Injectable()
export class JobProcessorService {
  private readonly logger = new Logger(JobProcessorService.name);
  private readonly maxConcurrencyPerJob = 5;

  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly jobRepository: JobRepositoryPort,
    @Inject(URL_PROBE)
    private readonly urlProbe: UrlProbePort,
  ) {}

  async processJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.mutate(jobId, (currentJob) => {
      if (currentJob.status === 'pending') {
        currentJob.status = 'in_progress';
      }
    });

    if (!job) {
      return;
    }

    try {
      let nextIndex = 0;
      const workers = Array.from(
        { length: Math.min(this.maxConcurrencyPerJob, job.totalCount) },
        async () => {
          while (true) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            if (currentIndex >= job.items.length) {
              return;
            }

            await this.processItem(jobId, currentIndex);
          }
        },
      );

      await Promise.all(workers);
      await this.finalizeJob(jobId);
    } catch (error) {
      await this.failJob(jobId, error);
    }
  }

  private async processItem(jobId: string, itemIndex: number): Promise<void> {
    let url: string | undefined;
    const startedAt = new Date().toISOString();
    await this.jobRepository.mutate(jobId, (job) => {
      const item = job.items[itemIndex];
      if (!item || item.status !== 'pending') {
        return;
      }

      item.status = 'in_progress';
      item.startedAt = startedAt;
      url = item.url;
    });

    if (!url) {
      return;
    }

    let nextStatus: 'success' | 'error' = 'success';
    let httpStatus: number | undefined;
    let errorMessage: string | undefined;

    try {
      httpStatus = await this.urlProbe.probe(url);
    } catch (error) {
      nextStatus = 'error';
      errorMessage = this.extractErrorMessage(error);
    }

    await this.randomDelay();

    await this.jobRepository.mutate(jobId, (job) => {
      const item = job.items[itemIndex];
      if (!item || item.status !== 'in_progress') {
        return;
      }

      item.status = nextStatus;
      item.httpStatus = httpStatus;
      item.errorMessage = errorMessage;
      item.finishedAt = new Date().toISOString();
      item.durationMs = this.calculateDuration(item);
    });
  }

  private async finalizeJob(jobId: string): Promise<void> {
    await this.jobRepository.mutate(jobId, (job) => {
      if (job.status === 'cancelled' || job.status === 'failed') {
        return;
      }

      const hasUnfinishedItems = job.items.some(
        (item) => item.status === 'pending' || item.status === 'in_progress',
      );

      if (!hasUnfinishedItems) {
        job.status = 'completed';
      }
    });
  }

  private async failJob(jobId: string, error: unknown): Promise<void> {
    this.logger.error(
      `Job ${jobId} failed with critical pipeline error`,
      error instanceof Error ? error.stack : undefined,
    );

    await this.jobRepository.mutate(jobId, (job) => {
      if (job.status === 'cancelled') {
        return;
      }

      job.status = 'failed';
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown probe error';
  }

  private calculateDuration(item: JobItem): number | undefined {
    if (!item.startedAt || !item.finishedAt) {
      return undefined;
    }

    return (
      new Date(item.finishedAt).getTime() - new Date(item.startedAt).getTime()
    );
  }

  private async randomDelay(): Promise<void> {
    const delayMs = Math.floor(Math.random() * 10_001);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
