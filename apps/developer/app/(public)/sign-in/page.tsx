"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Suspense, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { authClient } from "@/lib/auth-client"
import { PUBLIC_SITE_URL } from "@/lib/seo"

import { Notice } from "../../_components/ui"
import { AuthFrame, FieldError, inlineLink } from "../_components/auth-frame"
import { PasswordInput } from "../_components/password-input"
import { RedirectIfSignedIn } from "../redirect-if-signed-in"

const schema = z.object({
  email: z.string().trim().email("Saisissez une adresse e-mail valide."),
  password: z.string().min(1, "Saisissez votre mot de passe."),
})

type FormValues = z.infer<typeof schema>

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(
    params.get("error") === "forbidden"
      ? "Ce compte n'a pas accès au portail développeur."
      : null,
  )
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  })

  // Le rôle développeur n'est PAS attribué ici : le JWT Convex n'est pas
  // encore disponible juste après signIn. Le layout du portail s'en charge
  // dès que la sentinelle d'authentification répond (DeveloperBootstrap).
  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })
      if (result?.error) {
        setError(
          result.error.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "Adresse e-mail ou mot de passe incorrect."
            : (result.error.message ?? "Connexion impossible. Réessayez."),
        )
        return
      }
      router.push("/applications")
    } catch {
      setError("Connexion impossible. Vérifiez votre connexion et réessayez.")
    }
  })

  return (
    <AuthFrame
      kicker="Espace développeur"
      title="Se connecter"
      description="Accédez à vos applications, à vos clés et à votre usage."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/sign-up" className={inlineLink}>
            Créer un compte développeur
          </Link>
        </>
      }
    >
      <RedirectIfSignedIn />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error ? (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-11"
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <a href={`${PUBLIC_SITE_URL}/forgot-password`} className={`text-xs ${inlineLink}`}>
              Mot de passe oublié ?
            </a>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
        <p className="text-xs leading-5 text-idn-muted">
          Le compte est celui de l&apos;Identité Numérique : les mêmes identifiants servent sur
          identite.ga.
        </p>
      </form>
    </AuthFrame>
  )
}
