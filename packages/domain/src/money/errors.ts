/** Thrown when a money operation would break an invariant: a fractional or unsafe amount, mixed currencies, or an invalid rate. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}
