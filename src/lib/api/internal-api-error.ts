export class InternalApiError extends Error {
  constructor() {
    super('api.karasu256.com internal request failed');
    this.name = 'InternalApiError';
  }
}
