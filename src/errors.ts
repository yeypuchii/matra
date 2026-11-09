/** Thrown by a function whose milestone has not landed yet. Removed before 1.0. */
export class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';

  constructor(feature: string, plannedVersion: string) {
    super(`matra: ${feature} is not implemented yet. It is planned for ${plannedVersion}.`);
  }
}

export function notImplemented(feature: string, plannedVersion: string): never {
  throw new NotImplementedError(feature, plannedVersion);
}
