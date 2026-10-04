"use node"

import { randomUUID } from "node:crypto"
import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import { action } from "../_generated/server"
import { authComponent } from "../auth"
import { postPinned } from "../webhooks/delivery"
import {
  decryptWebhookSecret,
  signWebhookDelivery,
} from "../webhooks/crypto"
import {
  buildTestEnvelope,
  WEBHOOK_TEST_EVENT_TYPE,
} from "./webhookTestEnvelope"

/**
 * Envoie un événement `webhook.test` signé à un endpoint vérifié et renvoie le
 * résultat immédiatement au portail (statut HTTP, durée). Même transport, mêmes
 * en-têtes et même signature que les livraisons réelles : un récepteur qui
 * valide ce test validera les vrais événements.
 */
export const sendTestEvent = action({
  args: { endpointId: v.id("webhookEndpoints") },
  returns: v.object({
    eventId: v.string(),
    ok: v.boolean(),
    httpStatus: v.union(v.number(), v.null()),
    errorCode: v.union(v.string(), v.null()),
    durationMs: v.number(),
  }),
  handler: async (ctx, args) => {
    // Même exigence que les autres fonctions du portail (requireDeveloper) :
    // une session valide ; le rôle développeur est contrôlé dans la mutation.
    let user
    try {
      user = await authComponent.getAuthUser(ctx)
    } catch {
      user = null
    }
    if (!user) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Vous devez être connecté." })
    }
    const endpoint = await ctx.runMutation(
      internal.developer.webhookTestAccess.authorizeTestDelivery,
      { endpointId: args.endpointId, userId: user._id ?? user.userId ?? "" },
    )
    const createdAt = Date.now()
    const eventId = `evt_${randomUUID().replaceAll("-", "")}`
    const body = buildTestEnvelope(eventId, createdAt, endpoint.clientId)
    const timestamp = Math.floor(createdAt / 1000).toString()
    const secret = await decryptWebhookSecret(
      endpoint.secretCiphertext,
      endpoint.secretIv,
    )
    const signatures = [await signWebhookDelivery(secret, timestamp, body)]
    if (
      endpoint.previousSecretCiphertext &&
      endpoint.previousSecretIv &&
      (endpoint.previousSecretValidUntil ?? 0) > Date.now()
    ) {
      const previous = await decryptWebhookSecret(
        endpoint.previousSecretCiphertext,
        endpoint.previousSecretIv,
      )
      signatures.push(await signWebhookDelivery(previous, timestamp, body))
    }
    const started = Date.now()
    try {
      const response = await postPinned(
        endpoint.url,
        {
          "Content-Type": "application/json",
          "User-Agent": "IDN-Webhooks/1.0",
          "X-IDN-Event-Id": eventId,
          "X-IDN-Event-Type": WEBHOOK_TEST_EVENT_TYPE,
          "X-IDN-Timestamp": timestamp,
          "X-IDN-Signature": signatures.join(", "),
        },
        body,
      )
      const ok = response.status >= 200 && response.status < 300
      return {
        eventId,
        ok,
        httpStatus: response.status,
        errorCode: ok ? null : `HTTP_${response.status}`,
        durationMs: Date.now() - started,
      }
    } catch (error) {
      return {
        eventId,
        ok: false,
        httpStatus: null,
        errorCode:
          error instanceof Error
            ? error.message.slice(0, 120)
            : "NETWORK_ERROR",
        durationMs: Date.now() - started,
      }
    }
  },
})
