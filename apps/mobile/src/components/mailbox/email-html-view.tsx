import React, { useMemo, useState } from "react"
import { Linking, Platform } from "react-native"
import { WebView } from "react-native-webview"
import { documentForEmail, emailLayoutScript } from "@/lib/email-document"

function openExternalUrl(url: string) {
  if (!/^(https?:|mailto:|tel:)/i.test(url)) return
  void Linking.openURL(url)
}

export function EmailHtmlView({ html }: { html: string }) {
  const [height, setHeight] = useState(320)
  const source = useMemo(() => ({ html: documentForEmail(html) }), [html])

  if (Platform.OS === "web") return null

  return (
    <WebView
      source={source}
      originWhitelist={["about:blank"]}
      referrerPolicy="no-referrer"
      mixedContentMode="never"
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === "about:blank") return true
        openExternalUrl(request.url)
        return false
      }}
      injectedJavaScript={emailLayoutScript}
      onMessage={(event) => {
        const next = Number(event.nativeEvent.data)
        if (Number.isFinite(next) && next > 0) setHeight(Math.max(next, 160))
      }}
      scrollEnabled={false}
      style={{ height, backgroundColor: "#ffffff" }}
    />
  )
}
