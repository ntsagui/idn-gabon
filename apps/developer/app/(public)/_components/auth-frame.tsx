import type { ReactNode } from "react"

/** Cadre commun des écrans de connexion et d'inscription. */
export function AuthFrame({
  kicker,
  title,
  description,
  children,
  footer,
}: {
  kicker: string
  title: string
  description: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-[440px]">
        <div className="rounded-[14px] border border-idn-border bg-idn-surface px-6 py-7 sm:px-8">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            {kicker}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-8 tracking-[-0.01em] text-idn-ink">
            {title}
          </h1>
          <div className="mt-1.5 text-sm leading-6 text-idn-muted">{description}</div>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-idn-muted">{footer}</div> : null}
      </div>
    </div>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}

export const inlineLink =
  "font-medium text-idn-green underline-offset-2 hover:underline focus-visible:underline dark:text-idn-green-on-dark"
