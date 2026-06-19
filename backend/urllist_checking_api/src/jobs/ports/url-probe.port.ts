export const URL_PROBE = Symbol('URL_PROBE');

export interface UrlProbePort {
  probe(url: string): Promise<number>;
}
