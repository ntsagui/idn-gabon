"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { normalizeVerificationCode } from "../../../lib/official-act-verification"
import { verifier as content } from "../_content/fr"

const FORM = content.form

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, FORM.validation.required)
    .refine((value) => normalizeVerificationCode(value) !== null, FORM.validation.format),
})

type FormValues = z.infer<typeof schema>

/** Saisie du code d'un acte, quand le QR code ne se lit pas. */
export function VerifyCodeForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  })
  const error = errors.code?.message

  const onSubmit = handleSubmit(({ code }) => {
    const normalized = normalizeVerificationCode(code)
    if (normalized) router.push(`/verifier/${normalized}`)
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <Label htmlFor="verification-code">{FORM.label}</Label>
      <Input
        id="verification-code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        placeholder={FORM.placeholder}
        translate="no"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "verification-code-error" : "verification-code-help"}
        className="font-mono uppercase tracking-widest"
        {...register("code")}
      />
      {error ? (
        <p id="verification-code-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id="verification-code-help" className="text-sm text-muted-foreground">
          {FORM.help}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {FORM.submit}
      </Button>
    </form>
  )
}
