import { Injectable } from '@nestjs/common';
import type { UrlProbePort } from '../ports/url-probe.port';

@Injectable()
export class HttpUrlProbe implements UrlProbePort {
  private readonly timeoutMs = 10_000;

  async probe(url: string): Promise<number> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
      });

      return response.status;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeoutMs}ms`, {
          cause: error,
        });
      }

      if (error instanceof Error && error.message === 'fetch failed') {
        throw new Error('Request failed (DNS/connection error)', {
          cause: error,
        });
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
