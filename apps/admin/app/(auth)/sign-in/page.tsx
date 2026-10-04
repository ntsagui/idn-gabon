"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { LockKeyhole, Mail } from "lucide-react"
import { z } from "zod"

import { Button } from "@repo/ui/components/button"
import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { authClient } from "@/lib/auth-client"

import { fr } from "../../_content/fr"

const schema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
})

type FormValues = z.infer<typeof schema>

export default function AdminSignInPage() {
  return (
    <Suspense fallback={null}>
      <AdminSignInPageInner />
    </Suspense>
  )
}

function AdminSignInPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const errorFromQuery = params.get("error")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
    setFormError(null)
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })
      if (result?.error) {
        const code = result.error.code as string | undefined
        setFormError(
          code === "INVALID_EMAIL_OR_PASSWORD"
            ? fr.signIn.errorInvalid
            : (result.error.message ?? fr.signIn.errorGeneric),
        )
        setSubmitting(false)
        return
      }
      router.push("/dashboard")
    } catch {
      setFormError(fr.signIn.errorGeneric)
      setSubmitting(false)
    }
  })

  return (
    <main className="flex min-h-svh items-center justify-center bg-idn-bg px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <IdnMark size={36} />
          <div>
            <p className="text-[15px] font-semibold leading-5 text-idn-ink">Identité Numérique</p>
            <p className="adm-kicker">Administration</p>
          </div>
        </div>
        <IdnFlagBars width="100%" height={3} />

        <div className="adm-panel mt-6 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-idn-ink">
            Connexion à la console
          </h1>
          <p className="mt-1 text-sm text-idn-muted">
            Réservée aux administrateurs de la plateforme IDN.
          </p>

          {errorFromQuery === "forbidden" ? (
            <p role="alert" className="mt-5 rounded-md bg-[#FBE9E7] px-3 py-2.5 text-[13px] text-[#8C1D17] dark:bg-[#3A1513] dark:text-[#F2A49E]">
              {fr.signIn.errorForbidden}
            </p>
          ) : null}
          {formError ? (
            <p role="alert" className="mt-5 rounded-md bg-[#FBE9E7] px-3 py-2.5 text-[13px] text-[#8C1D17] dark:bg-[#3A1513] dark:text-[#F2A49E]">
              {formError}
            </p>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Adresse e-mail</Label>
              <div className="relative">
                <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "admin-email-error" : undefined}
                  className="h-11 pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email ? (
                <p id="admin-email-error" className="text-[13px] text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Mot de passe</Label>
              <div className="relative">
                <LockKeyhole aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "admin-password-error" : undefined}
                  className="h-11 pl-10"
                  {...register("password")}
                />
              </div>
              {errors.password ? (
                <p id="admin-password-error" className="text-[13px] text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? fr.signIn.submitting : fr.signIn.submit}
            </Button>
          </form>

          <p className="mt-5 border-t border-idn-border-soft pt-4 text-xs text-idn-muted">
            Accès perdu ? Contactez un autre administrateur de la plateforme. Un
            compte administrateur ne peut pas être récupéré par les codes
            provisoires du support : la procédure est renforcée.
          </p>
        </div>
      </div>
    </main>
  )
}
