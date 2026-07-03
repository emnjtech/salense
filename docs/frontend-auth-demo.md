# Frontend Authentication Demo Policy

The Phase 3 web MVP stores JWT access and refresh tokens in browser local storage so the local demo can move through registration, login, company setup, logout, and the authenticated Store Integrations workspace without a separate cookie/session transport layer.

This is intentionally a demo policy only.

Production hardening remains deferred and must decide:

- whether refresh tokens are transported with secure, HTTP-only, same-site cookies;
- whether access tokens remain in memory only;
- CSRF protections for any cookie-backed session transport;
- token refresh rotation behavior in the browser;
- session timeout UX and forced re-authentication;
- centralised redaction for auth and integration errors.

The current implementation never displays tokens, credential hashes, marketplace credentials, encrypted secrets, or raw marketplace payloads in the UI.
