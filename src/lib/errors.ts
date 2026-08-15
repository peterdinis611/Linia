export class TransitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitError";
  }
}
