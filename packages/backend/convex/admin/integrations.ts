import { v } from "convex/values"

import { query } from "../_generated/server"
import { requireAdmin } from "../lib/auth"

/**
 * État effectif des intégrations d'envoi (e-mail et SMS).
 *
 * Remplace, pour la console, le sélecteur `admin/providers` qui enregistre un
 * « fournisseur actif » sans qu'aucun envoi ne le lise : l'e-mail part
 * toujours par la passerelle mail IDN (`email/provider.tsx` →
 * `iboite/mailActions.sendThroughBridge`) et le SMS par Bird Verify
 * (`lib/birdVerify.ts`). Cette query lit donc ce qui est réellement câblé :
 *
 *   - la présence (jamais la valeur) des variables d'environnement requises ;
 *   - les rares éléments non secrets utiles au diagnostic (hôte de la
 *     passerelle, adresse d'expédition, région Bird déduite du préfixe) ;
 *   - le dernier envoi constaté, quand une trace existe en base.
 *
 * Traces disponibles : les messages iBoîte sortants passent par la même
 * passerelle et gardent leur `deliveryStatus` ; les SMS de récupération et de
 * changement de numéro sont journalisés `otp_sent` (canal `sms`) après
 * acceptation par Bird. Les e-mails transactionnels (codes, KYC) et les
 * échecs SMS ne sont pas persistés : la console ne prétend pas les connaître.
 */

const MESSAGE_SCAN = 500
const AUDIT_SCAN = 200

const ENV_ENTRY = v.object({
  name: v.string(),
  present: v.boolean(),
  required: v.boolean(),
  purpose: v.string(),
})

const DELIVERY = v.union(
  v.null(),
  v.object({ at: v.number(), detail: v.optional(v.string()) }),
)

function present(name: string): boolean {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export const getStatus = query({
  args: {},
  returns: v.object({
    email: v.object({
      provider: v.string(),
      configured: v.boolean(),
      env: v.array(ENV_ENTRY),
      bridgeHost: v.union(v.string(), v.null()),
      fromAddress: v.string(),
      fromIsDefault: v.boolean(),
      lastSuccess: DELIVERY,
      lastFailure: DELIVERY,
    }),
    sms: v.object({
      provider: v.string(),
      configured: v.boolean(),
      env: v.array(ENV_ENTRY),
      region: v.union(v.string(), v.null()),
      lastSuccess: DELIVERY,
      sentLast7Days: v.number(),
    }),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const emailEnv = [
      {
        name: "MAIL_BRIDGE_URL",
        present: present("MAIL_BRIDGE_URL"),
        required: true,
        purpose: "Adresse de la passerelle d'envoi",
      },
      {
        name: "MAIL_BRIDGE_TOKEN",
        present: present("MAIL_BRIDGE_TOKEN"),
        required: true,
        purpose: "Jeton d'authentification auprès de la passerelle",
      },
      {
        name: "MAIL_FROM",
        present: present("MAIL_FROM"),
        required: false,
        purpose: "Adresse d'expédition (défaut : notifications@idn.ga)",
      },
      {
        name: "MAIL_INBOUND_TOKEN",
        present: present("MAIL_INBOUND_TOKEN"),
        required: false,
        purpose: "Réception des courriers entrants iBoîte",
      },
    ]

    const birdKey = process.env.BIRD_API_KEY?.trim()
    const smsEnv = [
      {
        name: "BIRD_API_KEY",
        present: Boolean(birdKey),
        required: true,
        purpose: "Clé Bird Verify (envoi et vérification des codes SMS)",
      },
    ]
    // La région n'est pas un secret : elle est encodée dans le préfixe de
    // la clé (`bk_eu1_…`), seul ce préfixe est lu.
    const region = birdKey?.match(/^bk_(us1|eu1)_/)?.[1] ?? null

    // Messages les plus récents d'abord : on s'arrête au premier envoi
    // réussi et au premier échec par la passerelle.
    let lastSuccess: { at: number } | null = null
    let lastFailure: { at: number; detail?: string } | null = null
    const messages = await ctx.db
      .query("iboiteMessage")
      .order("desc")
      .take(MESSAGE_SCAN)
    for (const m of messages) {
      if (m.transport !== "smtp") continue
      if (!lastSuccess && m.deliveryStatus === "sent") {
        lastSuccess = { at: m.createdAt }
      }
      if (!lastFailure && m.deliveryStatus === "failed") {
        // Seul le code HTTP éventuel est exposé : le message d'erreur brut
        // de la passerelle peut contenir des adresses.
        const code = m.deliveryError?.match(/Mail bridge (\d{3})/)?.[1]
        lastFailure = {
          at: m.createdAt,
          ...(code ? { detail: `Réponse ${code} de la passerelle` } : {}),
        }
      }
      if (lastSuccess && lastFailure) break
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const smsEvents = await ctx.db
      .query("auditLog")
      .withIndex("by_action", (q) => q.eq("action", "otp_sent"))
      .order("desc")
      .take(AUDIT_SCAN)
    const smsSent = smsEvents.filter((e) => e.metadata?.channel === "sms")
    const lastSms = smsSent[0]

    const mailFrom = process.env.MAIL_FROM?.trim()
    return {
      email: {
        provider: "Passerelle mail IDN",
        configured: emailEnv.every((e) => !e.required || e.present),
        env: emailEnv,
        bridgeHost: hostOf(process.env.MAIL_BRIDGE_URL),
        fromAddress: mailFrom || "notifications@idn.ga",
        fromIsDefault: !mailFrom,
        lastSuccess,
        lastFailure,
      },
      sms: {
        provider: "Bird Verify",
        configured: Boolean(birdKey) && region !== null,
        env: smsEnv,
        region,
        lastSuccess: lastSms
          ? {
              at: lastSms.createdAt,
              detail:
                lastSms.metadata?.purpose === "pin_recovery"
                  ? "Récupération du PIN"
                  : "Changement de numéro",
            }
          : null,
        sentLast7Days: smsSent.filter((e) => e.createdAt >= sevenDaysAgo)
          .length,
      },
    }
  },
})
