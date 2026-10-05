import * as React from "react"

const LINK_PATTERN = /((?:https?:\/\/|www\.)[^\s<>]+)/gi

function trimTrailingPunctuation(value: string) {
  const match = value.match(/^(.*?)([.,;:!?*]+)?$/)
  return {
    href: match?.[1] ?? value,
    trailing: match?.[2] ?? "",
  }
}

export function EmailTextBody({ text }: { text: string }) {
  const normalized = text.replace(/<(https?:\/\/[^>\s]+)>/gi, "$1")
  const parts = normalized.split(LINK_PATTERN)

  return (
    <div className="whitespace-pre-wrap break-words p-4 text-sm leading-6 text-idn-ink md:p-5">
      {parts.map((part, index) => {
        if (!/^(?:https?:\/\/|www\.)/i.test(part)) {
          return <React.Fragment key={index}>{part}</React.Fragment>
        }
        const { href, trailing } = trimTrailingPunctuation(part)
        const target = /^https?:\/\//i.test(href) ? href : `https://${href}`
        return (
          <React.Fragment key={index}>
            <a
              href={target}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-medium text-c-green-text underline underline-offset-2"
            >
              {href}
            </a>
            {trailing}
          </React.Fragment>
        )
      })}
    </div>
  )
}
