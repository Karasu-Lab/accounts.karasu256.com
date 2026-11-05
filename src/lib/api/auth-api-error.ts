export class AuthApiError extends Error {
  constructor() {
    super('api-auth.karasu256.com request failed');
    this.name = 'AuthApiError';
  }
}
