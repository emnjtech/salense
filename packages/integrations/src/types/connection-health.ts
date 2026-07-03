export enum ConnectionHealthStatus {
  Healthy = "HEALTHY",
  Degraded = "DEGRADED",
  Unhealthy = "UNHEALTHY",
  AuthenticationExpired = "AUTHENTICATION_EXPIRED",
  Unknown = "UNKNOWN",
}

export interface ConnectionHealth {
  readonly status: ConnectionHealthStatus;
  readonly checkedAt: Date;
  readonly message?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
