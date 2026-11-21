export class AmbiguousPersonMatchError extends Error {
  constructor() {
    super(
      'Multiple People match this email. Choose a Person on the PlusVibe Lead record.',
    );
    this.name = 'AmbiguousPersonMatchError';
  }
}
