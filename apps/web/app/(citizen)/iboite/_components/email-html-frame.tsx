"use client"

import * as React from "react"

function emailDocument(html: string, dark: boolean): string {
  const foreground = dark ? "#f2f0e8" : "#16170f"
  const background = dark ? "#181c16" : "#ffffff"
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: cid:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'">
<base target="_blank">
<style>
html,body{margin:0;padding:0;background:${background};color:${foreground};font:14px/1.55 Arial,sans-serif;overflow-wrap:anywhere}
body{padding:20px} img{max-width:100%;height:auto} table{max-width:100%} pre{white-space:pre-wrap} a{color:#0e7c3a}
</style>
</head><body>${html}</body></html>`
}

export function EmailHtmlFrame({ html }: { html: string }) {
  const [height, setHeight] = React.useState(360)
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  const srcDoc = React.useMemo(() => emailDocument(html, dark), [dark, html])

  return (
    <iframe
      title="Contenu du message"
      srcDoc={srcDoc}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      referrerPolicy="no-referrer"
      onLoad={(event) => {
        const documentHeight =
          event.currentTarget.contentDocument?.documentElement.scrollHeight
        if (documentHeight)
          setHeight(Math.min(Math.max(documentHeight, 240), 4000))
      }}
      className="block w-full border-0 bg-idn-surface"
      style={{ height }}
    />
  )
}
