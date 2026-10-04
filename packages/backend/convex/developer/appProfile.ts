import { ConvexError, v } from "convex/values"

import { components } from "../_generated/api"
import type { MutationCtx } from "../_generated/server"
import { mutation, query } from "../_generated/server"
import { getCurrentAuthUser, requireDeveloper } from "../lib/auth"

/**
 * Portail développeur — fiche d'une application OAuth (nom, description,
 * logo, niveau de garantie exigé).
 *
 * Le nom et le logo sont affichés à l'usager sur l'écran de consentement
 * (`oauthAuthorize.ts` lit `name` et `icon`) : ils engagent la confiance de
 * l'usager, d'où des règles strictes (longueur, image hébergée par IDN ou en
 * https, formats raster uniquement).
 *
 * Le niveau de garantie exigé n'est modifiable qu'en sandbox : en production,
 * il a été examiné lors de la validation par l'administration, et l'abaisser
 * sans nouvelle revue contournerait cette validation.
 */

type OAuthAppDoc = {
  _id: string
  clientId?: string | null
  userId?: string | null
  metadata?: string | null
}

const MAX_NAME = 80
const MAX_DESCRIPTION = 500
const MAX_LOGO_BYTES = 512 * 1024
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"]

async function loadOwnedApp(
  ctx: MutationCtx,
  clientId: string,
  userId: string,
): Promise<OAuthAppDoc> {
  const raw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "oauthApplication",
    where: [{ field: "clientId", value: clientId, operator: "eq" }],
    paginationOpts: { numItems: 1, cursor: null },
  })) as { page: OAuthAppDoc[] }
  const doc = raw.page[0]
  if (!doc) {
    throw new ConvexError({ code: "NOT_FOUND", message: "App introuvable." })
  }
  if (doc.userId !== userId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Cette application ne vous appartient pas.",
    })
  }
  return doc
}

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw ?? "{}") as unknown
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

async function patchApp(
  ctx: MutationCtx,
  doc: OAuthAppDoc,
  update: Record<string, unknown>,
): Promise<void> {
  await ctx.runMutation(components.betterAuth.adapter.updateOne, {
    input: {
      model: "oauthApplication",
      where: [{ field: "_id", value: doc._id, operator: "eq" }],
      update: { ...update, updatedAt: Date.now() },
    },
  })
}

/** Met à jour le nom, la description et (en sandbox) le niveau exigé. */
export const updateProfile = mutation({
  args: {
    clientId: v.string(),
    name: v.string(),
    description: v.string(),
    loa: v.union(v.literal(1), v.literal(2), v.literal(3)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireDeveloper(ctx)
    const name = args.name.trim()
    if (!name || name.length > MAX_NAME) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: `Le nom doit contenir entre 1 et ${MAX_NAME} caractères.`,
      })
    }
    const description = args.description.trim()
    if (description.length > MAX_DESCRIPTION) {
      throw new ConvexError({
        code: "INVALID_DESCRIPTION",
        message: `La description est limitée à ${MAX_DESCRIPTION} caractères.`,
      })
    }
    const doc = await loadOwnedApp(ctx, args.clientId, user.userId)
    const meta = parseMetadata(doc.metadata)
    const currentLoa = meta.loa === 2 || meta.loa === 3 ? meta.loa : 1
    if (meta.env === "production" && args.loa !== currentLoa) {
      throw new ConvexError({
        code: "LOA_LOCKED",
        message:
          "Le niveau de garantie d'une application de production ne se modifie pas sans nouvelle validation.",
      })
    }
    await patchApp(ctx, doc, {
      name,
      metadata: JSON.stringify({ ...meta, description, loa: args.loa }),
    })
    return null
  },
})

/** URL d'envoi signée pour téléverser un logo dans le stockage Convex. */
export const generateLogoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireDeveloper(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Associe un logo téléversé à l'application, ou le retire (`storageId` absent).
 * Le fichier est contrôlé côté serveur : type raster et taille bornée. Un
 * fichier refusé est supprimé du stockage ; le refus est donc renvoyé comme
 * résultat et non levé, sinon la suppression serait annulée avec la
 * transaction.
 */
export const setLogo = mutation({
  args: {
    clientId: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), icon: v.union(v.string(), v.null()) }),
    v.object({ ok: v.literal(false), code: v.string(), message: v.string() }),
  ),
  handler: async (ctx, args) => {
    const user = await requireDeveloper(ctx)
    const doc = await loadOwnedApp(ctx, args.clientId, user.userId)
    if (!args.storageId) {
      await patchApp(ctx, doc, { icon: null })
      return { ok: true as const, icon: null }
    }
    const file = await ctx.db.system.get(args.storageId)
    if (!file) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Fichier introuvable.",
      })
    }
    if (!file.contentType || !LOGO_TYPES.includes(file.contentType)) {
      await ctx.storage.delete(args.storageId)
      return {
        ok: false as const,
        code: "INVALID_LOGO_TYPE",
        message: "Le logo doit être une image PNG, JPEG ou WebP.",
      }
    }
    if (file.size > MAX_LOGO_BYTES) {
      await ctx.storage.delete(args.storageId)
      return {
        ok: false as const,
        code: "LOGO_TOO_LARGE",
        message: "Le logo ne doit pas dépasser 512 Ko.",
      }
    }
    const icon = await ctx.storage.getUrl(args.storageId)
    if (!icon) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Fichier introuvable.",
      })
    }
    await patchApp(ctx, doc, { icon })
    return { ok: true as const, icon }
  },
})

/**
 * Logos des applications du développeur courant (`developer/apps.listMine`
 * n'expose pas `icon`). Lecture gracieuse : [] sans session ni rôle.
 */
export const listBranding = query({
  args: {},
  returns: v.array(
    v.object({ clientId: v.string(), icon: v.union(v.string(), v.null()) }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentAuthUser(ctx)
    if (!user || !user.roles.includes("developer")) return []
    try {
      const raw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "oauthApplication",
        where: [{ field: "userId", value: user.userId, operator: "eq" }],
        paginationOpts: { numItems: 200, cursor: null },
      })) as { page: Array<{ clientId?: string | null; icon?: string | null }> }
      return raw.page
        .filter((doc): doc is { clientId: string; icon?: string | null } =>
          Boolean(doc.clientId),
        )
        .map((doc) => ({ clientId: doc.clientId, icon: doc.icon ?? null }))
    } catch {
      return []
    }
  },
})
