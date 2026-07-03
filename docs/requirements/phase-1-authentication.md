# Phase 1 Authentication & User Management Trace

Source: Salense PRD + SES, Chapter 6.1 - Authentication & User Account Management.

This document maps the current implementation to the Chapter 6.1 requirements.

| Requirement                 | Implementation mapping                                                                                                    | Implementation status |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| FR-6.1.1 User Registration  | `AuthModule`, `AuthController.register`, `AuthService.register`, `RegisterRequestDto`                                     | Implemented           |
| FR-6.1.2 Email Verification | `AuthController.verifyEmail`, `AuthService.verifyEmail`, `EmailVerificationRequestDto`, placeholder `EmailService`        | Implemented           |
| FR-6.1.3 Login              | `AuthController.login`, `AuthService.login`, `LoginRequestDto`, `JwtSessionTokenService`                                  | Implemented           |
| FR-6.1.4 Session Management | `JwtAccessTokenGuard`, refresh token persistence, `AuthController.refreshSession`, `AuthController.logout`                | Implemented           |
| FR-6.1.5 Password Reset     | `AuthController.requestPasswordReset`, `AuthController.confirmPasswordReset`, `PasswordResetRequestDto`, reset token hash | Implemented           |
| FR-6.1.6 Company Profile    | `UsersModule`, `UsersController.updateCompanyProfile`, `UsersService.updateCompanyProfile`, `CompanyProfileRequestDto`    | Implemented           |
| Version 1 Change Password   | `AuthController.changePassword`, `AuthService.changePassword`, `ChangePasswordRequestDto`, refresh token revocation       | Implemented           |

## Safety Boundaries

- Real email delivery is still abstracted behind the placeholder `EmailService`.
- Multiple businesses, roles/permissions, billing, store integrations, dashboards, and AI logic remain out of scope for Phase 1 authentication.
- Refresh tokens are returned in API responses for now; cookie transport policy is still a production-hardening decision.
