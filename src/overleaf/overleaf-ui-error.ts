// Overleaf's page no longer matches an assumption this script makes about
// its DOM or React internals. The message names the assumption.
export class OverleafUiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverleafUiError";
  }
}
