# Phase 1 Authentication & Company Setup Trace

Source: Salense PRD + SES, Chapter 6.1 - Authentication & User Account Management, and Chapter 6.2 - Company Setup Module.

This document records the current backend implementation status for Phase 1. It is a requirements trace, not a product feature plan.

## Status Summary

Phase 1 backend authentication and company setup behavior is implemented for registration, email verification, login, session refresh, logout, password reset, change password, authenticated current-user lookup, and company profile setup.

The current implementation intentionally remains API-focused. It does not add dashboard UI behavior, production email delivery, billing, store integrations, roles, SSO, 2FA, or AI logic.

## Implemented Requirements

| PRD / SES area | Requirement | Implementation | Test coverage |
| --- | --- | --- | --- |
| FR-6.1.1 User Registration | Users can register with first name, last name, email, password, confirm password, and company name. Email addresses are unique. Passwords follow the Chapter 6.1 policy. | `POST /auth/register`, `RegisterRequestDto`, `AuthService.register`, Prisma `User` and `Business` models. Email is normalized, duplicate email is rejected, password is hashed, and the response excludes password data. | `apps/api/src/auth/__tests__/auth.service.test.ts`, `apps/api/src/auth/__tests__/auth-controller.contract.test.ts`, `apps/api/src/auth/__tests__/auth-dto.validation.test.ts`. |
| FR-6.1.2 Email Verification | Registration generates a secure verification token and prevents login until verification completes. | `EmailVerificationTokenService` creates random tokens and stores only token hashes. `POST /auth/email-verification` validates token hash, expiry, and reuse before marking `emailVerified = true`. `EmailService` is currently a placeholder delivery boundary. | Auth service tests cover token creation, valid verification, expired token, invalid token, and token reuse prevention. Contract tests cover route and validation behavior. |
| FR-6.1.3 Login | Users authenticate with email and password. Invalid credentials and unverified email are rejected. | `POST /auth/login`, `LoginRequestDto`, password comparison through password security utilities, safe user response, access token issuing, and refresh token issuing for verified users only. | Auth service and contract tests cover verified login, missing user, wrong password, unverified email, missing JWT config, safe claims, and sensitive-field exclusion. |
| FR-6.1.4 Session Management | The system maintains secure authenticated sessions and sessions expire after configurable periods. | `JwtSessionConfig` requires token secrets and expiry values. `JwtSessionTokenService` issues/verifies access and refresh tokens. `RefreshToken` stores only hashed refresh tokens with expiry and revocation state. `POST /auth/refresh`, `POST /auth/logout`, `JwtAccessTokenGuard`, and `GET /auth/me` provide session behavior. | Session service, auth service, guard/current-user, and contract tests cover access token verification, missing/invalid/expired tokens, missing users, refresh success, invalid/expired/revoked refresh tokens, logout revocation, and sensitive-field exclusion. |
| FR-6.1.5 Password Reset | Users can request a time-limited secure reset link by email and confirm a reset with a valid token. | `POST /auth/password-reset` normalizes email, creates a reset token only when the account exists, stores only the token hash, calls placeholder `EmailService`, and always returns a generic response. `POST /auth/password-reset/confirm` validates token hash, expiry, reuse state, and password policy before updating the password hash and marking the token used. | Auth service, token utility, DTO, and contract tests cover existing email, missing email generic response, valid reset, invalid token, expired token, reused token, weak password, changed hash, and sensitive-field exclusion. |
| FR-6.1.6 Company Profile | Users can maintain business name, logo, country, time zone, currency, tax preference, and industry. | `PUT /users/company-profile` is protected by `JwtAccessTokenGuard`. `CompanyProfileRequestDto` validates represented fields. `UsersService.updateCompanyProfile` upserts one `Business` profile for the authenticated user and returns only safe company data. | `apps/api/src/users/__tests__/users.service.test.ts`, `apps/api/src/users/__tests__/users.controller.test.ts`, and `apps/api/src/users/__tests__/company-profile-dto.validation.test.ts` cover authenticated update, missing user, validation, and safe response behavior. |
| Chapter 6.1 acceptance criteria | A user can register, verify email, log in, log out, reset password, and edit profile without administrator assistance. | Backend endpoints exist for each listed action. The "edit profile" acceptance item is represented by authenticated company profile setup; general user profile editing remains a separate deferred endpoint. | Covered across auth and users controller/service/DTO tests. |
| Chapter 6.1 validation rules | Passwords require at least 12 characters, uppercase, lowercase, number, and special character. Email addresses are unique. | Password policy is centralized in password security utilities and DTO validation. Unique email is enforced by Prisma schema and duplicate checks during registration. | Password utility, DTO validation, and registration tests cover valid and invalid policy cases. |
| Chapter 6.1 business rule | Version 1 supports one business per account while future releases may support multiple businesses. | Prisma `Business.ownerId` is unique for Version 1. `User.businesses` remains a collection so the relationship can evolve later without changing user ownership semantics. | Schema and users service tests cover one profile per authenticated owner via upsert by `ownerId`. |
| Chapter 6.2 Company Setup | The company profile establishes business identity and includes business name, trading name, logo, country, primary currency, time zone, industry, business size, and default reporting period. | Prisma `Business` includes all listed fields. The current API updates the fields required in the Phase 1 implementation prompt: business name, logo URL, country, primary currency, time zone, tax preference, and industry. | Company profile DTO/service/controller tests cover currently exposed API fields. |
| Chapter 6.2 mandatory profile rule | One company profile is mandatory before store integrations are permitted. | The schema supports one mandatory owner profile. Store integration gating is documented as deferred because store integrations are not implemented in Phase 1. | Not yet applicable beyond company profile persistence tests; integration gating must be tested when store integration endpoints are introduced. |
| Phase 1 change password | Authenticated users can change password securely. | `POST /auth/change-password` is protected by the access-token guard, verifies current password, validates new password and confirmation, hashes the new password, and revokes active refresh tokens for the user. | Auth service, controller, DTO, and contract tests cover success, unauthenticated access, missing user, wrong current password, weak new password, confirmation mismatch, changed hash, token revocation, and safe responses. |

## Intentionally Deferred

- Production email delivery, email templates, and externally reachable verification or reset links. The `EmailService` boundary exists, but delivery is still placeholder behavior.
- General user profile editing beyond company profile setup. `PUT /users/profile` remains intentionally not implemented.
- Multiple businesses per account. The schema is future-friendly, but Version 1 keeps `Business.ownerId` unique.
- Store integrations, dashboard configuration, and regional settings propagation. Chapter 6.2 says store integrations must stay disabled without a company profile; enforcement belongs with the future store integration module.
- Dashboard redirect behavior after login. The API returns a login response; client-side navigation belongs to the web app.
- 2FA, SSO, Google Login, Microsoft Login, and Apple Login.
- Roles, permissions, business access control beyond current-user ownership lookup, billing, AI logic, and store integration logic.

## Test Coverage Map

The Phase 1 API test suite covers:

- DTO validation for registration, login, email verification, password reset, refresh, logout, change password, and company profile requests.
- Auth controller contract behavior, including route availability, validation failures, token/session responses, and no sensitive response fields.
- Auth service behavior for registration, duplicate email, password hashing, verification tokens, login eligibility, JWT access and refresh tokens, refresh/logout, current user lookup, password reset, and change password.
- JWT session configuration and token utility behavior, including required config, safe claims, expiry parsing, token verification, and refresh token hashing.
- JWT access-token guard behavior for missing, malformed, invalid, expired, and valid bearer tokens.
- Company profile controller and service behavior for authenticated updates, missing users, validation failures, and safe response data.

No additional test changes were required during this documentation pass because the documented implemented behavior already has direct coverage.

## Production Hardening Items

These are the remaining security and operations decisions before production launch:

- Refresh-token rotation: refresh tokens are hashed and persisted, and logout/password change revokes tokens. The refresh endpoint currently returns a new access token while leaving the submitted refresh token valid until expiry or revocation. Before production, decide whether every refresh should rotate the refresh token, revoke the old hash, and detect reuse.
- Cookie vs bearer-token transport: access and refresh tokens are currently returned in JSON responses. Before production, choose between bearer-token transport and secure `HttpOnly`, `Secure`, `SameSite` cookies. If cookies are used, add CSRF protection and cookie-specific tests.
- Session expiry configuration: token expiry values are configurable through environment variables. Production still needs agreed access/refresh lifetimes, inactivity semantics, secret rotation policy, and operational runbooks for compromised sessions.
- Production email delivery: replace placeholder `EmailService` with a provider-backed implementation, templates, link construction, retry/error handling, and delivery observability.
- Abuse protection: add rate limiting, brute-force protection, reset request throttling, verification resend controls, and audit logs before exposing the auth surface publicly.
- Database operations: run Prisma migrations against managed PostgreSQL environments and verify backup, rollback, and migration promotion procedures.
