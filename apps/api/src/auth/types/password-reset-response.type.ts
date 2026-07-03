export interface PasswordResetRequestResponse {
  readonly passwordResetRequested: true;
}

export interface PasswordResetConfirmationResponse {
  readonly passwordReset: true;
}
