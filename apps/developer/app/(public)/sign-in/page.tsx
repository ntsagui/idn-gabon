"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useConvex } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { authClient } from "@/lib/auth-client"
import { PUBLIC_SITE_URL } from "@/lib/seo"

import { fr } from "../../_content/fr"
import { IdnIcons } from "../../_components/icons"

const schema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
})

type FormValues = z.infer<typeof schema>

export default function DeveloperSignInPage() {
  return (
    <Suspense fallback={null}>
      <DeveloperSignInPageInner />
    </Suspense>
  )
}

function DeveloperSignInPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const convex = useConvex()
  const errorFromQuery = params.get("error")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (errorFromQuery === "forbidden") {
      toast.error(fr.signIn.errorForbidden)
    }
  }, [errorFromQuery])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })
      if (result?.error) {
        const code = result.error.code as string | undefined
        toast.error(
          code === "INVALID_EMAIL_OR_PASSWORD"
            ? fr.signIn.errorInvalid
            : (result.error.message ?? fr.signIn.errorGeneric),
        )
        setSubmitting(false)
        return
      }
      try {
        await convex.mutation(api.developer.apps.ensureRole, {})
      } catch {
        // idempotent — si déjà attribué, no-op
      }
      router.push("/applications")
    } catch {
      toast.error(fr.signIn.errorGeneric)
      setSubmitting(false)
    }
  })

  return (
    <main className="mx-auto flex min-h-[calc(100svh-64px)] w-full max-w-[460px] flex-col justify-center px-6 py-16">
      <div className="text-center">
        <h1 className="text-[26px] font-semibold tracking-[-0.012em] text-idn-ink">
          {fr.signIn.title}
        </h1>
        <p className="mt-2 text-sm text-idn-muted">{fr.signIn.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="dev-email">{fr.signIn.emailLabel}</Label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-idn-muted"
              aria-hidden
            >
              {IdnIcons.mail}
            </span>
            <Input
              id="dev-email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "dev-email-error" : undefined}
              className="h-11 pl-11"
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p id="dev-email-error" role="alert" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dev-password">{fr.signIn.passwordLabel}</Label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-idn-muted"
              aria-hidden
            >
              {IdnIcons.lock}
            </span>
            <Input
              id="dev-password"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "dev-password-error" : undefined
              }
              className="h-11 pl-11"
              {...register("password")}
            />
          </div>
          {errors.password ? (
            <p
              id="dev-password-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="pt-1 text-right text-xs">
          {/* Pas de parcours propre : comptes partagés avec le portail citoyen. */}
          <a
            href={`${PUBLIC_SITE_URL}/forgot-password`}
            className="font-medium text-idn-green underline-offset-2 hover:underline focus-visible:underline"
          >
            {fr.signIn.forgotPassword}
          </a>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="h-12 w-full text-base"
        >
          {submitting ? fr.signIn.submitting : fr.signIn.submit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-idn-muted">
        {fr.signIn.noAccount}{" "}
        <Link
          href="/sign-up"
          className="font-medium text-idn-green underline-offset-2 hover:underline focus-visible:underline"
        >
          {fr.signIn.createAccount}
        </Link>
      </p>
    </main>
  )
}
