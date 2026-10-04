"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { authClient } from "@/lib/auth-client"

import { Notice } from "../../_components/ui"
import { AuthFrame, FieldError, inlineLink } from "../_components/auth-frame"
import { PasswordInput } from "../_components/password-input"
import { PENDING_EMAIL_KEY } from "./pending-email"

const schema = z
  .object({
    name: z.string().trim().min(2, "Saisissez votre nom (2 caractères minimum).").max(120),
    email: z.string().trim().email("Saisissez une adresse e-mail valide."),
    password: z.string().min(12, "12 caractères minimum.").max(256),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "Les deux mots de passe ne correspondent pas.",
  })

type FormValues = z.infer<typeof schema>

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
    mode: "onTouched",
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      })
      if (result?.error) {
        const code = result.error.code as string | undefined
        setError(
          code === "USER_ALREADY_EXISTS" || code === "EMAIL_ALREADY_EXISTS"
            ? "Un compte existe déjà avec cette adresse. Connectez-vous."
            : (result.error.message ?? "Inscription impossible. Réessayez."),
        )
        return
      }
      // Le serveur n'envoie pas de code à l'inscription
      // (emailOTP.sendVerificationOnSignUp = false) : on le demande ici.
      await authClient.emailOtp
        .sendVerificationOtp({ email: values.email, type: "email-verification" })
        .catch(() => undefined)
      try {
        window.sessionStorage.setItem(PENDING_EMAIL_KEY, values.email)
      } catch {
        // stockage indisponible : la page de vérification redemandera l'adresse
      }
      router.push("/sign-up/verify")
    } catch {
      setError("Inscription impossible. Vérifiez votre connexion et réessayez.")
    }
  })

  return (
    <AuthFrame
      kicker="Espace développeur"
      title="Créer un compte développeur"
      description="Gratuit. Vos applications démarrent en sandbox ; la production est ouverte après validation par l'administration."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/sign-in" className={inlineLink}>
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error ? (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom et prénom</Label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            className="h-11"
            {...register("name")}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail professionnelle</Label>
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
          <Label htmlFor="password">Mot de passe</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error password-hint" : "password-hint"}
            {...register("password")}
          />
          <p id="password-hint" className="text-xs text-idn-muted">
            12 caractères minimum. Les mots de passe présents dans des fuites publiques sont refusés.
          </p>
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? "confirm-error" : undefined}
            {...register("confirm")}
          />
          <FieldError id="confirm-error" message={errors.confirm?.message} />
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Création du compte…" : "Créer mon compte"}
        </Button>
      </form>
    </AuthFrame>
  )
}
