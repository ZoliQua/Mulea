export class MuleaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MuleaError';
  }
}
