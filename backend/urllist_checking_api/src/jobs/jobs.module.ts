import { Module } from '@nestjs/common';
import { JobProcessorService } from './application/job-processor.service';
import { JobsService } from './application/jobs.service';
import { HttpUrlProbe } from './infrastructure/http-url.probe';
import { InMemoryJobRepository } from './infrastructure/in-memory-job.repository';
import { JobsController } from './jobs.controller';
import { JOB_REPOSITORY } from './ports/job-repository.port';
import { URL_PROBE } from './ports/url-probe.port';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    JobProcessorService,
    InMemoryJobRepository,
    HttpUrlProbe,
    {
      provide: JOB_REPOSITORY,
      useExisting: InMemoryJobRepository,
    },
    {
      provide: URL_PROBE,
      useExisting: HttpUrlProbe,
    },
  ],
})
export class JobsModule {}
