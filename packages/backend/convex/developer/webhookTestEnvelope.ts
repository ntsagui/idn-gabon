/**
 * Enveloppe de l'événement de test des webhooks. Module pur (sans fonction
 * Convex) pour être importable depuis l'action Node `webhookTest.ts`.
 */

export const WEBHOOK_TEST_EVENT_TYPE = "webhook.test" as const

/** Corps JSON de l'événement de test, au format de l'enveloppe v1. */
export function buildTestEnvelope(
  eventId: string,
  createdAt: number,
  clientId: string,
): string {
  return JSON.stringify({
    id: eventId,
    type: WEBHOOK_TEST_EVENT_TYPE,
    apiVersion: "1",
    createdAt,
    subject: clientId,
    data: {
      message:
        "Événement de test envoyé depuis le portail développeur Identité Numérique.",
    },
  })
}
