"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import {
  oneTimeTokenClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const SITE_URL =
  typeof window !== "undefined" ? window.location.origin : undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: any = createAuthClient({
  baseURL: SITE_URL || undefined,
  plugins: [
    convexClient(),
    crossDomainClient(),
    oneTimeTokenClient(),
    // Challenge 2FA à la connexion (verifyTotp / verifyBackupCode), comme le
    // mobile. Sans `onTwoFactorRedirect`, l'écran de connexion aiguille lui-même.
    twoFactorClient(),
    // Clés d'accès WebAuthn (signIn.passkey, passkey.addPasskey).
    passkeyClient(),
  ],
});
