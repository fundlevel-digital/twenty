export class UnresolvedOwnedInboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnresolvedOwnedInboxError';
  }
}
