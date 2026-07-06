"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createAuthApiClient } from "../../lib/api/auth-client";
import { AuthPageShell, FormMessage } from "./auth-page-shell";

export function EmailVerificationResult() {
  const token = useSearchParams()?.get("token");
  const authClient = useMemo(() => createAuthApiClient(), []);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">(
    token ? "loading" : "missing",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    authClient
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) {
          setStatus("success");
          setMessage("Email verified. You can sign in now.");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Verification failed.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authClient, token]);

  return (
    <AuthPageShell
      eyebrow="Email verification"
      footer={<Link href="/login">Return to login</Link>}
      summary="Verification protects the business workspace before store data is connected."
      title="Verification result"
    >
      {status === "loading" ? (
        <FormMessage tone="info">Checking verification token...</FormMessage>
      ) : null}
      {status === "missing" ? (
        <FormMessage tone="error">Verification token is missing.</FormMessage>
      ) : null}
      {status === "success" ? <FormMessage tone="success">{message}</FormMessage> : null}
      {status === "error" ? <FormMessage tone="error">{message}</FormMessage> : null}
    </AuthPageShell>
  );
}
